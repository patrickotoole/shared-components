from lib.helpers import *

SELECT = "select endpoint, name, advertiser_id, id from adwords_campaign_endpoint where active=1 and deleted = 0 and advertiser_id = '%s'"

class AdwordsHelper:

    def helper_replace(self,url):
        url = url.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan')
        url = url.replace('selected_action','filter_id') 
        url = url + '&prevent_sample=true&num_days=2'
        return url

    @decorators.deferred
    def build_response(self,advertiser_id, plan):
        data = self.crushercache.select_dataframe(SELECT % advertiser_id)
        if plan == "media":
            data['endpoint'] = data['endpoint'].apply(lambda x : self.helper_replace(x))
        resp = {"response":data.to_dict('records')}
        return resp
