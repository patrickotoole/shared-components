import requests
from link import lnk
import ujson

class AdwordsCreator():

    def __init__(self,hindsight,adw):
        self.hindsight = hindsight
        self.adwords_wrapper = adw
        self.adwords_wrapper.user='test_rick'
        self.adwords_wrapper.authenticate()

    def create_budget(self,name, amount):
        post_data = {'name':name, 'amount':amount}
        import ipdb; ipdb.set_trace()
        resp = self.adwords_wrapper.post('/budget', data=ujson.dumps(post_data))
        budget_id = resp.json['budget_id']
        return budget_id

    def create_campaign(self, name, budget_id):
        import ipdb; ipdb.set_trace()
        post_data = {'name':name, 'budget_id':budget_id}
        resp = self.adwords_wrapper.post('/campaign', data=ujson.dumps(post_data))
        camp_id = resp['campaign_id']
        return camp_id

    def make_category_campaign(self, categories_budget):
        for category in categories_budget:
            self.create_campaign(category['category_name'],category['budget_id']) 

    def get_hindsight_mediaplan(self):
        resp = self.hindsight.get('/crusher/v1/visitor/mediaplan?format=json&url_pattern=/')
        data = resp.json['mediaplan']
        return data

    def create_adgroup(self, name, camp_id, bid_amount):
        post_data = {'name': name, 'campaign_id': camp_id, 'bid_amount': bid_amount}
        resp = self.adwords_wrapper.post('/adgroup', data = ujson.dumps(post_data))
        adgroup_id = resp.json['adgroup_id']
        return adgroup_id

    def create_placement(self, url, adgroup_id):
        post_data = {"placement_ul":url, "adgroup_id":adgroup_id}
        resp = self.adwords_wrapper.post('/placement', data = ujson.dumps(post_data))
        return None

    def process_plan(self,mediaplan):
        final = {}
        for item in mediaplan:
            temp = final.get(item['parent_category_name'],False)
            if temp:
                final[item['parent_category_name']].append(item['domain'])
            else:
                final[item['parent_category_name']] = [item['domain']]
        return final

if __name__ =="__main__":

    hindsight = lnk.api.crusher
    hindsight.user='test_rick'
    hindsight.authenticate()
    adwords_wrapper = lnk.api.adwords
    import ipdb; ipdb.set_trace()
    adcreator =AdwordsCreator(hindsight, adwords_wrapper)
    #budget_id = adcreator.create_budget('sample_budget2', 100000) #options.amount)
    budget_id = 976422954 
    camp_id = adcreator.create_campaign('sample_campaign', budget_id)

    mediaplan = adcreator.get_hindsight_mediaplan()
    processed_plan = adcreator.process_plan(mediaplan)
    for category in process_plan.keys():
        adgroup_id = self.create_adgroup(category, camp_id, 0.01)
        for domain in process_plan[category]:
            self.create_placement(domain, adgroup_id)

