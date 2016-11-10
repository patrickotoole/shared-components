import ujson
from tornado import web
from adwords import AdWords
import json

class ScheduleHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    # List
    def get(self, campaign_id):
        advertiser_id = self.get_secure_cookie('advertiser')
        response = self.adwords.read_schedule(campaign_id=campaign_id,advertiser_id=advertiser_id)

        self.write(response)

    # Create
    def post(self, campaign_id):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        schedule = {
            'campaign_id': campaign_id
        }

        #Not in adwords
        #response = self.adwords.create_schedule('schedule'=schedule,'advertiser_id'=advertiser_id)

        self.write(response)

