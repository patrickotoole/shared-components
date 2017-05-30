from lib.helpers import *

SELECT = "select endpoint, name, advertiser_id, id from adwords_campaign_endpoint where active=1 and deleted = 0 and advertiser_id = '%s'"

class AdwordsHelper:

    @decorators.deferred
    def build_response(self,advertiser_id, plan):
        data = self.crushercache.select_dataframe(SELECT % advertiser_id)
        if plan == "media":
            data['endpoint'] = data['endpoint'].apply(lambda x : x.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id') + '&prevent_sample=true&num_days=2')
        resp = {"response":data.to_dict('records')}
        return resp
