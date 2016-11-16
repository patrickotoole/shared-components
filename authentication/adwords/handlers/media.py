import json
from tornado import web
from adwords import AdWords
import base64
import ujson

class MediaHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords', None)

    # List
    def get(self):
        media_input =  2212157213
        advertiser_id = self.get_secure_cookie('advertiser')
        media = self.adwords.get_media(advertiser_id, media_input)
        self.write(ujson.dumps(media[0]))

        # sql = "SELECT * FROM `advertiser_adwords_media`"
        # df = self.db.select_dataframe(sql)

        # media = []
        # i = 0
        # df_json = json.loads(df.to_json())
        # while(i < len(df)):
        #     media.append({
        #         'media_id': df_json['media_id'][str(i)],
        #         'width': df_json['width'][str(i)],
        #         'height': df_json['height'][str(i)],
        #         'mimetype': df_json['mimetype'][str(i)],
        #         'advertiser_id': df_json['advertiser_id'][str(i)],
        #         'ts_uploaded': df_json['ts_uploaded'][str(i)]
        #     })

        #     i = i + 1

        # self.render('views/media.html', media_rows=media)

    # Create
    def post(self):
        #post_data = json.loads(self.request.body)

        image_data = self.request.files['image']
        image_data = base64.encodestring(image_data[0]['body'])
        advertiser_id = self.get_secure_cookie('advertiser')
        #advertiser_id = int(post_data['advertiser_id'])
        #image_url = post_data['url']
        #name = post_data['name'] 

        #response = self.adwords.create_media(image_url,name, advertiser_id, image_data)
        response = self.adwords.create_media(advertiser_id, image_data)
        self.write(response)

        # Show list of media next to upload form with its status
        # Create option of creating display ads in campaign creation script

        advertiser_id = self.get_secure_cookie('advertiser')

        #sql = "INSERT INTO `advertiser_adwords_media` (`media_id`, `width`, `height`, `mimetype`, `advertiser_id`, `ts_uploaded`) VALUES ('%(media_id)s', '%(width)s', '%(height)s', '%(mimetype)s', '%(advertiser_id)s', NOW());" % {
        #    'media_id': response['id'],
        #    'width': response['width'],
        #    'height': response['height'],
        #    'mimetype': response['mimetype'],
        #    'advertiser_id': advertiser_id
        #}
        #df = self.db.execute(sql)
