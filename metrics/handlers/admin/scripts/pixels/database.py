from helpers import * 
import ujson

GET_PIXEL_STRING = """select group_concat(pixel_source_name SEPARATOR '|') pixel_string from ( select pixel_source_name from advertiser where external_advertiser_id=%(advertiser_id)s union select external_segment_id from advertiser_segment where external_advertiser_id=%(advertiser_id)s and segment_name like '%%All Pages%%' union select concat(s.external_segment_id,":",ap.pixel_id) from advertiser_segment s join advertiser_pixel ap on s.external_advertiser_id=ap.external_Advertiser_id where s.external_advertiser_id=%(advertiser_id)s and segment_name like '%%Purchase%%' and ap.pixel_display_name='Purchase' union select concat(s.external_segment_id,":",ap.pixel_id) from advertiser_segment s join advertiser_pixel ap on s.external_advertiser_id=ap.external_Advertiser_id where s.external_advertiser_id=%(advertiser_id)s and segment_name like '%%Signup%%' and ap.pixel_display_name='Signup' union select external_segment_id from advertiser_segment where external_advertiser_id=%(advertiser_id)s and segment_name like '%%Logged%%') a;"""

class AdvertiserDatabase:

    def __init__(self,*args,**kwargs):
        self.db = kwargs.get("db",None)

    def get_advertiser(self,advertiser_id):

        try:
            advertiser_id = int(advertiser_id)
            Q = "SELECT pixel_source_name from advertiser where external_advertiser_id = '%s'"
            pixel_source_name = self.db.select_dataframe(Q % advertiser_id).iloc[0].pixel_source_name
        except:
            Q = "SELECT external_advertiser_id from advertiser where pixel_source_name = '%s'"
            pixel_source_name = advertiser_id
            advertiser_id = self.db.select_dataframe(Q % advertiser_id).iloc[0].external_advertiser_id

        pixel_hash = self.get_pixel_hash(advertiser_id)

        return (advertiser_id, pixel_source_name, pixel_hash)


class PixelDatabase:
    
    def __init__(self,*args,**kwargs):
        self.db = kwargs.get("db",None)


    def get_pixel_hash(self,advertiser_id):

        Q = GET_PIXEL_STRING % {"advertiser_id": advertiser_id}
        return self.db.select_dataframe(Q).ix[0,'pixel_string']

    def get_templates(self,template_type, implementation):

        Q = "SELECT * FROM templates WHERE type = '%s' and implementation = '%s'"
        templates = self.db.select_dataframe(Q % (template_type,implementation)).set_index("name") 
        templates['fields'] = templates.fields.map(ujson.loads)

        return templates

    def get_segments(self, advertiser_id, pixel_source_name, pixel_hash):

        Q = """SELECT * FROM advertiser_segment_conversion 
        WHERE external_advertiser_id = '%s' and deleted = 0 and segment_implemented is not null
        """
        segment_pixels = self.db.select_dataframe(Q % advertiser_id)
        segment_pixels['pixel_source_name'] = pixel_source_name
        segment_pixels['event_name'] = segment_pixels['segment_name'].map(parse_event_name)

        import base64
        segment_pixels['pixel_hash'] = base64.b64encode(pixel_hash)

        return segment_pixels


    def get_pixel(self, advertiser_id, template_type="script", implementation="media", with_comment=False):

        advertiser_id, pixel_source_name, pixel_hash  = self.get_advertiser(advertiser_id)
        
        templates      = self.get_templates(template_type, implementation)
        segment_pixels = self.get_segments(advertiser_id, pixel_source_name, pixel_hash)

        views = segment_pixels[segment_pixels.event_name == "view"]
        segs  = segment_pixels[segment_pixels.pixel_id.isnull() & (segment_pixels.event_name != "view")]
        convs = segment_pixels[segment_pixels.pixel_id.notnull()]

        views_px = compile(templates.ix['all_pages_pixel'],views,with_comment)
        segs_px  = compile(templates.ix['segment_pixel'],segs,with_comment)
        convs_px = compile(templates.ix['conversion_pixel'],convs,with_comment)

        pixels = {
            "segment_pixels": views_px + segs_px ,
            "conversion_pixels": convs_px
        }

        return pixels
