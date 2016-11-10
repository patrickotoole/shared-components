import ujson
from tornado import web
from adwords import AdWords
import json
import uuid

class BudgetHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db', None)
        self.adwords = kwargs.get('adwords',None)

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        response = self.adwords.read_budget(advertiser_id)

        self.write(response)

    def post(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        budget_input = {
            'name': '%s #%s' % (post_data['name'], uuid.uuid4()),
            'amount': str(post_data['amount'])
        }
        response = self.adwords.create_budget(budget_input=budget_input, advertiser_id=advertiser_id)

        self.write(response)
