import ujson
from handlers.helpers import *    


class AdvertiserAPI:
    
    def __init__(self,*args,**kwargs):
        self.api = kwargs.get("api",None)

    def create_advertiser(self,advertiser_name):
        data = an_advertiser_data(advertiser_name)
        response = self.api.post('/advertiser',data=ujson.dumps(data)).json

        error = response['response'].get("error",False)
        if error: raise Exception(error)

        advertiser_id = response["response"]["advertiser"]["id"]
        return advertiser_id

