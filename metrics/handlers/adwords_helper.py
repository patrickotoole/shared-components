from lib.helpers import *

SELECT = "select * from adwords_campaign_endpoint where active=1 and deleted = 0 and advertiser_id = '%s'"

class AdwordsHelper:

    @decorators.deferred
    def build_response(self,advertiser_id, plan):
        data = self.crushercache.select_dataframe(SELECT % advertiser_id)
        if plan == "media":
            resp_list = []
            for i,row in data.iterrows():
                converted_half = row['endpoint'].replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id')
                converted = converted_half + '&prevent_sample=true&num_days=2'
                resp_list.append({"advertiser":self.current_advertiser_name, "mediaplan_url":converted, "name":row['name']})
            resp = {"mediaplans":resp_list}
        else:
            resp = {"response":data.to_dict('records')}
        return resp
