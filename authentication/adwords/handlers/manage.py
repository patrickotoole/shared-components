import ujson
from tornado import web
from adwords import AdWords
import json
import requests

class ManageHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        advertiser_id = 713924

        # Get Hindsight Data
        cookies = {
            'advertiser': '2|1:0|10:1475769532|10:advertiser|8:Nzg3ODM5|bf2a9d7e296cb522075f5c82be372bd4de78ca169abe7b49fd7aaed353432509',
            'user': '2|1:0|10:1475769532|4:user|16:YV9mc2FzdG9yZQ==|b57cd27a27e2ad0dfb4df3a27f53ef6157d6534ab3f20bcf712ffc882151ba9e'
        }

        r = requests.get('http://beta.crusher.getrockerbox.com/crusher/v1/visitor/mediaplan?url_pattern=/', cookies=cookies)
        hindsight_data = json.loads(r.content)

        # # Get default advertiser settings
        sql = "SELECT * FROM advertiser_adwords WHERE advertiser_id = %d" % (int(advertiser_id))
        df = self.db.select_dataframe(sql)

        if(len(df) == 0):
            self.write('User could not be found')
            self.finish()

        advertiser = {
            'advertiser_id': df.ix[0]['advertiser_id'],
            'account_id': df.ix[0]['account_id'],
            'settings': {
                'budget_id': df.ix[0]['budget_id'],
                'impressions': df.ix[0]['impressions'],
                'bid_amount': df.ix[0]['bid_amount'],
                'url': df.ix[0]['url'],
                'headline': df.ix[0]['headline'],
                'description1': df.ix[0]['description1'],
                'description2': df.ix[0]['description2'],
                'type': df.ix[0]['type']
            }
        }

        self.write(advertiser)

        for category in hindsight_data['categories'][0:1]:
            # Create campaign
            campaign_input = {
                'name': 'AI Campaign - %s' % category,
                'budget_id': advertiser['settings']['budget_id'],
                'impressions': advertiser['settings']['impressions'],
                'category': category
            }
            campaign = self.adwords.create_campaign(campaign=campaign_input, advertiser_id=advertiser_id)

            # Set schedule
            schedule_input = {
                'campaign_id': campaign['id'],
                'mediaplan': hindsight_data['mediaplan'],
                'category': category
            }
            schedule = self.adwords.set_schedule(schedule=schedule_input,advertiser_id=advertiser_id)

            # Create adgroup
            adgroup_input = {
                'campaign_id': campaign['id'],
                'adgroup_name': 'AI AdGroup',
                'bid_amount': advertiser['settings']['bid_amount']
            }
            adgroup = self.adwords.create_adgroup(arg=adgroup_input,advertiser_id=advertiser_id)

            # Set keyword
            # keyword = AdWords().Keyword.set(adgroup)

            # Set placement
            placement_input = {
                'adgroup_id': adgroup['id'],
                'mediaplan': hindsight_data['mediaplan'],
                'category': category
            }

            placement = self.adwords.set_placement(arg=placement_input,advertiser_id=advertiser_id)

            # Set vertical
                # vertical = AdWords().Vertical.set(adgroup)

            # Create ad
            ad_input = {
                'adgroup_id': adgroup['id'],
                'final_url': advertiser['settings']['url'],
                'display_url': advertiser['settings']['url'],
                'headline': advertiser['settings']['headline'],
                'description1': advertiser['settings']['description1'],
                'description2': advertiser['settings']['description2'],
                'type': advertiser['settings']['type']
            }
            ad = self.adwords.create_ad(arg=ad_input,advertiser_id=advertiser_id)

            sql = "INSERT INTO `advertiser_adwords_campaign` (`campaign_id`, `advertiser_id`, `category`, `adgroup_id`, `ad_id`, `ts_created`) VALUES ('%(campaign_id)s', '%(advertiser_id)s', '%(category)s', '%(adgroup_id)s', '%(ad_id)s', NOW());" % {
                'campaign_id': campaign['id'],
                'advertiser_id': advertiser_id,
                'category': category,
                'adgroup_id': adgroup['id'],
                'ad_id': ad['id']
            }
            df = self.db.execute(sql)

        self.write(hindsight_data)
