from helpers import * 
from pandas import DataFrame

import ujson

INSERT_ADVERTISER = """
INSERT INTO advertiser ( external_advertiser_id, advertiser_name, pixel_source_name)
VALUES ( %(advertiser_id)s, '%(advertiser_name)s' , '%(pixel_source_name)s')
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


        return (advertiser_id, pixel_source_name)

    def insert_advertiser(self, advertiser_id, advertiser_name, pixel_source_name, **body):

        fields = self.db.select_dataframe("SHOW columns FROM advertiser")['Field'].tolist()

        valid = {i:j for i,j in body.items() if i in fields}
        valid['external_advertiser_id'] = advertiser_id
        valid['advertiser_name'] = advertiser_name
        valid['pixel_source_name'] = pixel_source_name

        query = INSERT_ADVERTISER % valid
        self.db.execute(query)

        Q = "select id from advertiser where external_advertiser_id = %s" 
        df = self.db.select_dataframe(Q % advertiser_id)
        return df["id"][0]

 
