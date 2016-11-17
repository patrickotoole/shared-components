import logging
import uuid
import ujson
from tornado import web
from adwords import AdWords
import json

QUERY = "insert into advertiser_adwords_campaign (campaign_id, advertiser_id, budgetID) values (%s, %s, %s)"
SELECT = "select campaign_id from advertiser_adwords_campaign where advertiser_id = '%s'"

class CampaignHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        response = self.adwords.read_campaign(advertiser_id)
        if 'json' in self.request.headers.get('Accept').split(',')[0]:
            self.write(ujson.dumps(response))
        else:
            self.render("templates/campaign.html", data=response)

    # Create
    def post(self):
        name = self.get_argument('campname',False)
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        budget_amount_str = self.get_argument('budget',False)


        if not name:
            post_data = json.loads(self.request.body)
            name = post_data['name']
            budget_id = int(post_data['budget_id'])
        else:
            import random
            budget_name = "budget_amount_%s_%s" % (str(budget_amount_str), str(random.randint(0,100)))
            try:
                budget_amount = float(budget_amount_str) * 1000000
            except:
                raise Exception("Not a valid budget amount")
            budget_input = {'name':budget_name, "amount": int(budget_amount)}
            budget_response = self.adwords.create_budget(advertiser_id=advertiser_id, budget_input=budget_input)
            budget_id = int(budget_response['budget_id'])

        if not name:
            post_data = json.loads(self.request.body)
            name = post_data['name']
            budget_id = post_data['budget_id']

        response = self.adwords.create_campaign(advertiser_id=advertiser_id, arg={
            'name': name,
            'budget_id': budget_id
        })

        response = self.adwords.read_campaign(advertiser_id)
        prior_camps = self.db.select_dataframe(SELECT % advertiser_id)
        prior_camp_list = prior_camps.campaign_id.tolist()
        resp = {}
        for camp in response:
            try:
                if str(camp['id']) not in prior_camp_list:
                    self.db.execute(QUERY, (camp['id'],advertiser_id, budget_id))
                    resp['id'] = camp['id']
                    resp['name'] = camp['name']
            except:
                logging.info("campaign already in db")
                logging.info(camp['id'])

        if 'json' in self.request.headers.get('Accept').split(',')[0]:
            self.write(ujson.dumps(resp))
        else:
            self.render("templates/campaign.html", data=response)

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
