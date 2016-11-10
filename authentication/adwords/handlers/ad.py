import ujson
from tornado import web
from adwords import AdWords

class AdHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords', None)

    # List
    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        adgroup_id = self.get_argument('adgroup_id', '')

        response = self.adwords.get_ads(advertiser_id, adgroup_id)
        self.write(response)

    def post(self): 
        post_data = ujson.loads(self.request.body)
        
        advertiser_id = int(post_data['advertiser_id'])
        ad_type = post_data['type']
        mediaID = post_data['media_id']
        name = post_data['name']
        ad_group_id = post_data['ad_group_id']
        response = self.adwords.create_ad(advertiser_id, ad_type, mediaID, name, ad_group_id)
        self.write(ujson.dumps(response))
