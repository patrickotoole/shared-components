from link import lnk
from lib.helpers import *

QUERY = "SELECT name, advertiser_id, endpoint from adwords_campaign_endpoint where active=1 and deleted = 0 and advertiser_id=%s"

class TransformHelper():

    def __init__(self, crushercache, db, hindsight):
        self.crushercache = crushercache
        self.db = db
        self.hindsight = crusher_api

    def select_endpoint(self, advertiser_id):
        advertiser_id = advertiser_id if advertiser_id else 0
        data = self.crushercache.select_dataframe(QUERY % advertiser_id)
        return data

    def process_endpoint(self,endpoint):
        converted_half = endpoint.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id')
        converted = converted_half + '&prevent_sample=true&num_days=2'
        return converted

    @decorators.deferred
    def build_response(self, advertiser_id):
        resp_list = []
        df = self.select_endpoint(advertiser_id)
        for i,row in df.iterrows():
            converted_url = self.process_endpoint(row['endpoint'])
            advertiser = self.current_advertiser_name
            resp_list.append({"advertiser":advertiser, "mediaplan_url":converted_url, "name":row['name']})
        return {"mediaplans":resp_list}
