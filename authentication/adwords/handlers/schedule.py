import ujson
from tornado import web
from adwords import AdWords
import json

class ScheduleHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    # List
    def get(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        campaign_id = self.get_argument('campaign_id', False)
        response = self.adwords.read_schedule(campaign_id=campaign_id,advertiser_id=advertiser_id)
        self.write(response)

    # Create
    def post(self):
        post_data = json.loads(self.request.body)
        #advertiser_id = int(self.get_secure_cookie('advertiser'))
        advertiser_id = int(post_data['advertiser_id'])
        schedule = {
            'campaign_id': post_data['campaign_id']
        }

        #Not in adwords
        response = self.adwords.set_schedule(camopaign_id=post_data['campaign_id'],advertiser_id=advertiser_id)

        self.write(response)

