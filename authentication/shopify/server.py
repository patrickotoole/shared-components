import tornado.ioloop
from tornado import httpserver
from tornado import web

import json
import time
import logging
import os
import urllib,urllib2,requests

from link import lnk

# secrets_path = os.path.abspath('../shopify/secrets.json');
secrets_path = os.path.abspath('secrets.json');
with open(secrets_path) as data_file:
    SETTINGS = json.load(data_file)

class DBQuery:
    def getShopifyID(self, shop, access_token):
        url = 'https://%s/admin/shop.json?access_token=%s' % (shop, access_token)
        req = urllib2.Request(url)
        res = urllib2.urlopen(req)
        data = json.loads(res.read())
        return data['shop']['id']

    def getShop(self, shop_domain):
        sql = "SELECT * FROM %(db_table)s WHERE `shop_domain` = '%(shop_domain)s'" % {
            "db_table": SETTINGS['db']['name'],
            "shop_domain": shop_domain
        }
        df = self.db.select_dataframe(sql)

        if(len(df) == 0):
            return {
                'empty': True
            }

        return {
            'empty': False,
            'shop_id': df.ix[0]['shop_id'],
            'shop_domain': df.ix[0]['shop_domain'],
            'advertiser_id': df.ix[0]['advertiser_id'],
            'script_id': df.ix[0]['script_id'],
            'access_token': df.ix[0]['access_token']
        }

    def getPixel(self, pixel_uuid, shop):
        pixel_url = "%(pixel_url)s?uuid=%(pixel_uuid)s" % {
            'pixel_url': SETTINGS['pixel_url'],
            'pixel_uuid': pixel_uuid
        }

        url = 'https://%(shop_domain)s/admin/script_tags.json?access_token=%(access_token)s&src=%(pixel_url)s?uuid=%(pixel_uuid)s' % {
            'shop_domain': shop['shop_domain'],
            'access_token': shop['access_token'],
            'pixel_url': SETTINGS['pixel_url'],
            'pixel_uuid': pixel_uuid
        }
        req = urllib2.Request(url)
        res = urllib2.urlopen(req)
        data = json.loads(res.read())
        return data['script_tags']

    def generateShopifyAccessToken(self, code, shop):
        url = 'https://%s/admin/oauth/access_token' % (shop)

        data = urllib.urlencode({
            'client_id': SETTINGS['shopify']['client_id'],
            'client_secret': SETTINGS['shopify']['client_secret'],
            'code': code
        })
        req = urllib2.Request(url, data)
        res = urllib2.urlopen(req)
        data = json.loads(res.read())
        return data['access_token']

def apivalidation(x):
    def fn(self):
        self.set_header('Content-Type', 'application/json; charset=UTF-8')
        return x(self)
    return fn

class IndexHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        if(len(self.get_argument('pixel_uuid', '')) == 0 ):
            self.render("index.html")
        else:
            shop_domain = self.get_argument('shop')
            shop = DBQuery.getShop(self, shop_domain)
            pixel_uuid = self.get_argument('pixel_uuid')
            self.write(json.dumps(shop))

    def post(self):
        pixel_uuid = self.get_argument('pixel_uuid')
        shop_domain = self.get_argument('shop')
        shop = DBQuery.getShop(self, shop_domain)
        existing_pixel = DBQuery.getPixel(self, pixel_uuid, shop)

        # Prepare payload for Shopify API
        pixel_src = "%(pixel_url)s?uuid=%(pixel_uuid)s" % {
            'pixel_url': SETTINGS['pixel_url'],
            'pixel_uuid': pixel_uuid
        }
        payload = json.dumps({
            "script_tag": {
                "event": "onload",
                "src": pixel_src,
                "display_scope": "all"
            }
        });
        data_len = len(payload)

        # Remove previous script, if any
        url = 'https://%(shop_domain)s/admin/script_tags/%(script_id)s.json?access_token=%(access_token)s' % {
            'shop_domain': shop['shop_domain'],
            'script_id': shop['script_id'],
            'access_token': shop['access_token']
        }
        r = requests.delete(url)

        # Create
        url = 'https://%(shop_domain)s/admin/script_tags.json?access_token=%(access_token)s' % {
            'shop_domain': shop['shop_domain'],
            'access_token': shop['access_token']
        }
        req = urllib2.Request(url, payload, {
            'Content-Type': 'application/json',
            'Content-Length': data_len
        })
        res = urllib2.urlopen(req)
        data = json.loads(res.read())

        # Save script ID in our db
        new_script_id = data['script_tag']['id']
        sql = 'UPDATE %(db_table)s SET script_id=%(new_script_id)s WHERE shop_id = %(shop_id)d' % {
            'db_table': SETTINGS['db']['name'],
            'new_script_id': new_script_id,
            'shop_id': int(shop['shop_id'])
        }
        df = self.db.execute(sql)

        self.write(json.dumps(data))
        self.finish()

class AuthenticationCallbackHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        code = self.get_argument('code','')
        shop_domain = self.get_argument('shop','')
        advertiser_id = self.get_secure_cookie('advertiser')
        access_token = DBQuery.generateShopifyAccessToken(self, code, shop_domain)
        shop_id = DBQuery.getShopifyID(self, shop_domain, access_token)

        sql = "INSERT INTO `%(db_table)s` (`shop_id`, `shop_domain`, `advertiser_id`, `script_id`, `access_token`, `ts_created`) VALUES ('%(shop_id)s', '%(shop_domain)s', '%(advertiser_id)s', NULL, '%(access_token)s', NOW()) ON DUPLICATE KEY UPDATE shop_domain='%(shop_domain)s', access_token='%(access_token)s'" % {
            'db_table': SETTINGS['db']['name'],
            'shop_id': shop_id,
            'shop_domain': shop_domain,
            'advertiser_id': advertiser_id,
            'access_token': access_token
        }

        df = self.db.execute(sql)
        self.redirect('/')
        self.finish()


class WebApp(web.Application):

    def __init__(self):
        db = lnk.dbs.rockerbox
        connectors = {"db": db}

        handlers = [
            (r'/authenticate', AuthenticationCallbackHandler, connectors),
            (r'/', IndexHandler, connectors),
        ]

        settings = dict(
            static_path='static',
            cookie_secret='rickotoole',
            debug=True
        )

        super(WebApp, self).__init__(handlers, **settings)

def main():
    logging.basicConfig(level=logging.INFO)
    app = WebApp()
    server = httpserver.HTTPServer(app, ssl_options={
        "certfile": SETTINGS['ssl']['certfile'],
        "keyfile": SETTINGS['ssl']['keyfile'],
    })
    server.listen(9001, '0.0.0.0')
    logging.info("Serving at http://0.0.0.0:8888")
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info("Interrupted...")
    finally:
        pass


if __name__ == '__main__':
    main()
