import tornado.web
import ujson
import json
import pandas
import StringIO

API_QUERY = "select * from %s where %s "

class CampaignHandler(tornado.web.RequestHandler):

    def initialize(self, db, api):
        self.db = db 
        self.api = api

    @tornado.web.asynchronous
    def get(self):
        _id = self.get_argument("id",False)
        campaign = yield self.api.get("/campaign?id=%s" % _id).json['response']['campaign']
        self.write("<pre>%s</pre>"  % json.dumps(campaign,indent=4))
        self.finish()

    def post(self):
        pass

