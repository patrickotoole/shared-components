import ujson
from tornado import web
from adwords import AdWords

class AdGroupHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        campaign_id = self.get_argument('campaign_id', '')
        
        response = self.adwords.read_adgroup(campaign_id,advertiser_id)

        self.write(response)

    # Create
    def post(self):
        post_data = ujson.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']

        arg = {
            'campaign_id': str(post_data['campaign_id']),
            'adgroup_name': str(post_data['name']),
            'bid_amount': str(post_data['bid_amount'])
        }

        response = self.adwords.create_adgroup(arg=arg, advertiser_id=advertiser_id)

        self.write(response)

