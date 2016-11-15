import ujson
from tornado import web
from adwords import AdWords

QUERY = 'INSERT INTO advertiser_adwords (advertiser_id, token, clientID, status) VALUES (%(advertiser_id)s, %(token)s, %(clientID)s, %(status)s) ON DUPLICATE KEY UPDATE token="%(token)s"'

class CallbackHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    def get(self):
        auth_code = self.get_argument('code')
        credentials = self.adwords.RB.flow.step2_exchange(auth_code)
        advertiser_id = self.get_secure_cookie('advertiser')

        import datetime
        self.adwords.adwords_object[advertiser_id]={}
        self.adwords.adwords_object[advertiser_id]['client'] = None
        self.adwords.adwords_object[advertiser_id]['token'] = ujson.loads(credentials.to_json())
        self.adwords.adwords_object[advertiser_id]['expires'] = datetime.datetime.strptime(ujson.loads(credentials.to_json())['token_expiry'],'%Y-%m-%dT%H:%M:%SZ')

        adwords_client = self.adwords.adwordsClient(self.adwords.adwords_object[advertiser_id]['token'], advertiser_id)

        customer_id = self.adwords.adwords_object[advertiser_id]['ID']

        #valid_account = 0
        #try:
        #    account = self.adwords.read_campaign(advertiser_id)
        #    import ipdb; ipdb.set_trace()
        #    account = self.adwords.create_account(advertiser_id=advertiser_id, arg={
        #        'name': 'Rockerbox AI Trader',
        #        'currency': 'USD',
        #        'timezone': 'America/New_York',
        #    })
        #    valid_account = 1
        #except:
        #    self.write(ujson.dumps({"Error":"Issue getting account, check Adwords account status"}))

        #if valid_account == 1:
        df = self.db.execute(QUERY, {'advertiser_id': str(advertiser_id),'clientID':str(customer_id),'token': credentials.to_json(), "status":"PrePending"})
        self.render("templates/core.html",data={'adid':advertiser_id})
        #self.write(ujson.dumps({"Status":"PrePending","Actions":"Check email to authorize Rockerbox Manager"}))
