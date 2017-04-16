import tornado.web
import ujson
import pandas
import mock
import time
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *

SELECT = '''
SELECT a.* FROM
(
    SELECT name, endpoint, last_activity
    FROM adwords_campaign_endpoint
    WHERE advertiser_id = %(advertiser_id)s
    AND active = 1 AND deleted = 0
) a
JOIN
(
    SELECT name, max(last_activity) as last_activity
    FROM adwords_campaign_endpoint
    WHERE advertiser_id = %(advertiser_id)s
    AND active = 1 AND deleted = 0
    GROUP BY 1
) b
ON(a.name = b.name AND a.last_activity = b.last_activity)
'''

INSERT = "insert into adwords_campaign_endpoint (advertiser_id, name, endpoint) values (%s, %s, %s)"
INSERT2 = "insert into yoshi_setup (external_advertiser_id, mediaplan, line_item_name, num_domains) values (%s, %s, %s, 20)"


class AdwordsHandler(BaseHandler):

    def initialize(self, db=None, crushercache=None, **kwargs):
        self.db = db
        self.crushercache = crushercache

    def get(self):
        advertiser_id = self.current_advertiser
        data = self.crushercache.select_dataframe(SELECT % {'advertiser_id':advertiser_id})
        self.write( ujson.dumps({"response":data.to_dict('records')}) )

    def post(self):
        advertiser_id = self.current_advertiser
        post_data = ujson.loads(self.request.body)
        self.crushercache.execute(INSERT, (advertiser_id, post_data['name'], post_data['endpoint']))
        if post_data.get('line_item',False): 
            self.db.execute(INSERT2, (advertiser_id, post_data['name'], post_data['line_item']))

        self.write(ujson.dumps({"status":"Success"}))

