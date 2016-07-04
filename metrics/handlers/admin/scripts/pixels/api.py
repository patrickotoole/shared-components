import ujson

from helpers import *    

class PixelAPI:
    
    def __init__(self,*args,**kwargs):
        self.api = kwargs.get("api",None)

    def create_conversion(self, advertiser_id, advertiser_name, segment_name):
        data = an_conv_data(advertiser_name, segment_name)

        URL = "/pixel?advertiser_id=%s" % advertiser_id
        response = self.api.post(URL,data=ujson.dumps(data)).json
        pixel_id = response["response"]["pixel"]["id"]

        return an_format_return(advertiser_id, pixel_id, segment_name)

    def create_segment(self, advertiser_id, advertiser_name, segment_name):
        data = an_seg_data(advertiser_name, segment_name)
        
        URL = "/segment?advertiser_id=%s" % advertiser_id
        response = self.api.post(URL,data=ujson.dumps(data)).json
        segment_id = response["response"]["segment"]["id"]

        return seg_format_return(segment_id, advertiser_name, segment_name)


    def create_pixel(self,advertiser_id, advertiser_name, segment_name, segment_type="segment"):
        resp = {}
        args = [advertiser_id, advertiser_name, segment_name]

        if segment_type == "conversion":
            resp["conversion"] = self.create_conversion(*args)

        resp["segment"] = self.create_segment(*args)

        return resp
