import requests
from link import lnk
import ujson

class AdwordsCreator():

    def __init__(self,hindsight,adw):
        self.hindsight = hindsight
        self.adwords_wrapper = adw

    def create_budget(self,amount):
        data = {'name':'adwords_build', 'amount':amount}
        self.adwords_wrapper.post('/budget', data=ujson.dumps(data))
        return budget_id

    def create_campaign(self, name):
        post_data = {}
        return None

    def make_hourly_campaign(self):
        return None

    def get_hindsight_mediaplan(self):
        resp = self.hindsight.get('/crusher/v1/visitor/mediaplan?format=json&url_pattern=/')
        data = resp.json['mediaplan']
        return data

    def create_adgroup(self):
        return None

    def create_placement(self, adgroup)
        return None

    def sample_get(self):
        self.adw.get()

if __name__ =="__main__":

    hindsight = lnk.api.crusher
    hindsight.user='test_rick'
    hindsight.authenticate()
    adwords_wrapper = lnk.api.adwords
    adcreator =AdwordsCreator(hindsight, adwords_wrapper)
