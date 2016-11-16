import requests
from link import lnk
import ujson

class AdwordsCreator():

    def __init__(self,hindsight,adw):
        self.hindsight = hindsight
        self.adwords_wrapper = adw

    def create_budget(self,name, amount):
        post_data = {'name':name, 'amount':amount}
        resp = self.adwords_wrapper.post('/budget', data=ujson.dumps(post_data))
        budget_id = resp['budget_id']
        return budget_id

    def create_campaign(self, name, budget_id):
        post_data = {'name':name, 'budget_id':budget_id}
        resp = self.adwords_wrapper.post('/budget', data=ujson.dumps(post_data))
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


if __name__ =="__main__":

    hindsight = lnk.api.crusher
    hindsight.user='test_rick'
    hindsight.authenticate()
    adwords_wrapper = lnk.api.adwords
    adcreator =AdwordsCreator(hindsight, adwords_wrapper)
