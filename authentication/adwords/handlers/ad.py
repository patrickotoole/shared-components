import logging
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
        tempdata={}
        tempdata['data'] = []
        try:
            for ad in ujson.loads(response['ads'])[2][1]:
                temp={}
                tempdata['adgroup_id'] = ad[0][1]
                temp['name'] = ad[1][1][5][1]
                temp['id'] = ad[1][1][0][1]
                temp['url'] = ad[1][1][1][1]
                temp['status'] = ad[2][1]
                temp['approval'] =ad[3][1]
                temp['img'] = ad[1][1][4][1][3][1][1][1][1]
                tempdata['data'].append(temp)
        except:
            logging.info("no ads in ad group")

        if 'json' in self.request.headers.get('Accept').split(',')[0]:
            self.write(ujson.dumps(tempdata))
        else:
            self.render('templates/ads.html', data=tempdata)

    def post(self): 
        post_data = ujson.loads(self.request.body)

        advertiser_id = int(self.get_secure_cookie('advertiser'))
        ad_type = post_data['type']
        mediaID = post_data['media_id']
        name = post_data['name']
        ad_group_id = post_data['ad_group_id']
        response = self.adwords.create_ad(advertiser_id, ad_type, mediaID, name, ad_group_id)
        self.write(ujson.dumps(response))
