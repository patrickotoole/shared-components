import ujson
from tornado import web
from adwords import AdWords

class AccountHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords', None)

    # List
    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        response = self.adwords.get_account(advertiser_id)

        self.write(ujson.dumps(response))

    # Create
    def post(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        arg = {
            'name': 'Rockerbox Test',
            'currency': 'USD',
            'timezone': 'America/New_York'
        }
        response = self.adwords.create_account(advertiser_id=advertiser_id, arg=arg)

        self.write(ujson.dumps(response['value'][0]['customerId']))
