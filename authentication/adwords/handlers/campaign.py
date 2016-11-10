import uuid
import ujson
from tornado import web
from adwords import AdWords
import json

class CampaignHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        response = self.adwords.read_campaign(advertiser_id)

        self.write(response)

    # Create
    def post(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        response = self.adwords.create_campaign(advertiser_id=advertiser_id, arg={
            'budget_id': str(post_data['budget_id']),
            'name': '%s #%s' % (post_data['name'], uuid.uuid4()),
            'impressions': str(post_data['impressions'])
        })

        self.write(response)

    # Update
    # id: campaign_id
    # status: ENABLED, PAUSED
    def put(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        adwords_client = self.adwords.get_adwords_client(advertiser_id)

        campaign_service = adwords_client.GetService('CampaignService', version='v201607')

        campaign_id = str(post_data['id'])
        status = str(post_data['status'])

        operations = [{
            'operator': 'SET',
            'operand': {
                'id': campaign_id,
                'status': status
            }
        }]

        try:
            campaigns = campaign_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Campaign successfully updated.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to update the campaign.'
            }

        self.write(response)

    # Remove
    # id: campaign_id
    def delete(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        adwords_client = self.adwords.get_adwords_client(advertiser_id)

        campaign_service = adwords_client.GetService('CampaignService', version='v201607')
        campaign_id = str(post_data['id'])

        operations = [{
            'operator': 'SET',
            'operand': {
                'id': campaign_id,
                'status': 'REMOVED'
            }
        }]

        try:
            campaigns = campaign_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Campaign successfully removed.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to remove the campaign.'
            }

        self.write(response)
