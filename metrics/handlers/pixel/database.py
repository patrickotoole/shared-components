from helpers import * 
from pandas import DataFrame

import ujson

GET_PIXEL_STRING = """select group_concat(pixel_source_name SEPARATOR '|') pixel_string from ( select pixel_source_name from advertiser where external_advertiser_id=%(advertiser_id)s union select external_segment_id from advertiser_segment where external_advertiser_id=%(advertiser_id)s and segment_name like '%%All Pages%%' union select concat(s.external_segment_id,":",ap.pixel_id) from advertiser_segment s join advertiser_pixel ap on s.external_advertiser_id=ap.external_Advertiser_id where s.external_advertiser_id=%(advertiser_id)s and segment_name like '%%Purchase%%' and ap.pixel_display_name like '%%Purchase' union select concat(s.external_segment_id,":",ap.pixel_id) from advertiser_segment s join advertiser_pixel ap on s.external_advertiser_id=ap.external_Advertiser_id where s.external_advertiser_id=%(advertiser_id)s and segment_name like '%%Signup%%' and ap.pixel_display_name like '%%Signup' union select external_segment_id from advertiser_segment where external_advertiser_id=%(advertiser_id)s and segment_name like '%%Logged%%') a;"""

INSERT_PIXEL = """
INSERT INTO advertiser_pixel (
    external_advertiser_id,
    pixel_id,
    pixel_display_name,
    pixel_name,
    pc_window_hours,
    pv_window_hours
)
VALUES (
    '%(external_advertiser_id)s',
    '%(pixel_id)s',
    '%(pixel_display_name)s',
    '%(pixel_name)s' ,
    '%(pc_window_hours)s',
    '%(pv_window_hours)s'
)
"""

INSERT_SEGMENT = """
INSERT INTO advertiser_segment (
    external_advertiser_id,
    external_member_id,
    external_segment_id,
    segment_name,
    segment_implemented
)
VALUES (
    '%(external_advertiser_id)s',
    '%(external_member_id)s',
    '%(external_segment_id)s',
    '%(segment_name)s',
    X'%(segment_implemented)s'
)
"""


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


class PixelDatabase(AdvertiserDatabase):
    
    def __init__(self,*args,**kwargs):
        self.db = kwargs.get("db",None)

    def get_pixel_hash(self,advertiser_id):

        Q = GET_PIXEL_STRING % {"advertiser_id": advertiser_id}
        return self.db.select_dataframe(Q).ix[0,'pixel_string']

    def get_templates(self,template_type="script", implementation="media"):

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


    def get_pixel(self, advertiser_id, template_type="script", implementation="media", with_comment=False, skip_compile=False):

        advertiser_id, pixel_source_name, pixel_hash  = self.get_advertiser(advertiser_id)
        
        templates      = self.get_templates(template_type, implementation)
        segment_pixels = self.get_segments(advertiser_id, pixel_source_name, pixel_hash)

        views = segment_pixels[segment_pixels.event_name == "view"]
        segs  = segment_pixels[segment_pixels.pixel_id.isnull() & (segment_pixels.event_name != "view")]
        convs = segment_pixels[segment_pixels.pixel_id.notnull()]

        views_px = compile(templates.ix['all_pages_pixel'],views,with_comment,skip_compile)
        segs_px  = compile(templates.ix['segment_pixel'],segs,with_comment,skip_compile)
        convs_px = compile(templates.ix['conversion_pixel'],convs,with_comment,skip_compile)

        pixels = {
            "segment_pixels": views_px + segs_px ,
            "conversion_pixels": convs_px
        }

        return pixels

    def insert_pixel(self,pixel,pixel_source_name, advertiser_id):

        is_conversion = pixel.get("conversion",False)

        templates = self.get_templates()
        template = templates.ix['segment_pixel']
        if is_conversion: template = templates.ix['conversion_pixel']

        data = {
            "segment_name": pixel['segment']['segment_name'],
            "pixel_source_name": pixel_source_name,
            "external_segment_id": pixel['segment']['segment_id'],
            "pixel_id": pixel.get("conversion",{}).get("pixel_id",0),
            "advertiser_id": advertiser_id
        }

        data['rendered'] = compile(template, DataFrame([data]), True)

        if is_conversion: 
            conv_data = {
                "external_advertiser_id": data['advertiser_id'],
                "pixel_id": data['pixel_id'],
                "pixel_display_name": data['segment_name'],
                "pixel_name": data['segment_name'],
                "pc_window_hours":720*60,
                "pv_window_hours": 720*60
            }
            query = INSERT_PIXEL % conv_data
            self.db.execute(query)


        params = {
            "external_advertiser_id": data['advertiser_id'],
            "external_segment_id": data['external_segment_id'],
            "segment_name": data['segment_name'],
            "advertiser_id": data['advertiser_id'],
            "external_member_id": 2024,
            "segment_implemented": data['rendered'][0]['compiled'].encode("hex")
        }
        query = INSERT_SEGMENT % params
        self.db.execute(query)

        return data['rendered'][0]
