import logging
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
        budget_id = resp.json['budget_id']
        return budget_id

    def create_campaign(self, name, budget_id):
        post_data = {'name':name, 'budget_id':budget_id}
        header = {'Accept':'text/json'}
        resp = self.adwords_wrapper.post('/campaign', data=ujson.dumps(post_data), headers=header)
        camp_id = resp.json['id']
        return camp_id

    def make_category_campaign(self, categories_budget):
        for category in categories_budget:
            self.create_campaign(category['category_name'],category['budget_id']) 

    def get_hindsight_mediaplan(self):
        resp = self.hindsight.get('/crusher/v1/visitor/mediaplan?format=json&url_pattern=/')
        data = resp.json['mediaplan']
        return data

    def create_adgroup(self, name, camp_id, bid_amount):
        post_data = {'name': name, 'campaign_id': camp_id, 'bid_amount': str(bid_amount)}
        header = {'Accept':'text/json'}
        resp = self.adwords_wrapper.post('/adgroup', data = ujson.dumps(post_data), headers=header)
        adgroup_id = resp.json['id']
        return adgroup_id

    def create_placement(self, url, adgroup_id):
        post_data = {"placement_url":url, "adgroup_id":adgroup_id}
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
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("campaign_name",  default="unnamedCampaign")
    define("budget", default=0.01)
    define("bid", default=0.01)
    define("override", default=False)
    define("adwords_advertiser", default='test_rick')
    define("hindsight_advertiser", default='rockerbox')
    define("password", default = "admin")
    basicConfig(options={})

    parse_command_line()

    name = options.campaign_name
    budget = int(float(options.budget) * 1000000)
    bid = int(float(options.bid) * 1000000)

    logging.info(name)
    logging.info(budget)
    logging.info(bid)
    logging.info(options.adwords_advertiser)
    logging.info(options.hindsight_advertiser)
 
    if not options.override:
        if budget > 10000000000:
            raise Exception("budget over 10,000 set override to true and rerun if correct")
        if bid > 10000000:
            raise Exception("bid over 10 set override to true and rerun if correct")

    hindsight = lnk.api.crusher
    hindsight.user="a_%s" % options.hindsight_advertiser
    hindsight.authenticate()
    adwords_wrapper = lnk.api.adwords
    adwords_wrapper.user=options.adwords_advertiser
    adwords_wrapper.password=options.password
    adwords_wrapper.authenticate()

    import ipdb; ipdb.set_trace()
    adcreator =AdwordsCreator(hindsight, adwords_wrapper)
    budget_id = adcreator.create_budget('RBDisplaybudget', budget)
    #budget_id = 976422954 
    camp_id = adcreator.create_campaign(name, budget_id)
    #camp_id = 700720973

    mediaplan = adcreator.get_hindsight_mediaplan()
    processed_plan = adcreator.process_plan(mediaplan)
    for category in processed_plan.keys():
        adgroup_id = adcreator.create_adgroup(category, camp_id, bid)
        for domain in processed_plan[category]:
            adcreator.create_placement(domain, adgroup_id)

