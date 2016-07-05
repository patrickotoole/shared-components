from helpers import * 
from lib.helpers import *
from pandas import DataFrame

import ujson

INSERT_ADVERTISER = """
INSERT INTO advertiser ( external_advertiser_id, advertiser_name, pixel_source_name)
VALUES ( %(advertiser_id)s, '%(advertiser_name)s' , '%(pixel_source_name)s')
"""

API_QUERY = "select * from advertiser where %s "

INCLUDES = {
    "pixels":"advertiser_pixel",
    "campaigns": "advertiser_campaign",
    "segments": "advertiser_segment",
    "domain_lists": "advertiser_domain_list",
    "insertion_orders": "insertion_order"
}

class AdvertiserDatabase:

    def __init__(self,*args,**kwargs):
        self.db = kwargs.get("db",None)

    def get_advertiser(self,advertiser_id):
        where = ("external_advertiser_id = %s" % advertiser_id)
        df = self.db.select_dataframe(API_QUERY % where).set_index("external_advertiser_id")
        
        includes = self.get_argument("include","segments")

        include_list = includes.split(",")
        for include in include_list:
            included = INCLUDES.get(include,False)
            if included:
              q = "select * from %s where %s" % (included,where)
              idf = self.db.select_dataframe(q)
              if len(idf) > 0:
                  df[include] = idf.groupby("external_advertiser_id").apply(Convert.df_to_values) 

        return df.to_dict('records')


    def insert_advertiser(self, advertiser_id=None, advertiser_name=None, pixel_source_name=None, **body):

        fields = self.db.select_dataframe("SHOW columns FROM advertiser")['field'].tolist()

        valid = {i:j for i,j in body.items() if i in fields}
        valid['advertiser_id'] = advertiser_id
        valid['advertiser_name'] = advertiser_name
        valid['pixel_source_name'] = pixel_source_name

        query = INSERT_ADVERTISER % valid
        self.db.execute(query)

        Q = "select id from advertiser where external_advertiser_id = %s" 
        df = self.db.select_dataframe(Q % advertiser_id)
        return df["id"][0]

 
