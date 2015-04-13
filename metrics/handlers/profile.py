import tornado.web
import ujson
import pandas
import StringIO
import mock
import time
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import *  

PROFILE_COLUMNS = [
    "id","domain_targets",
    "platform_placement_targets","country_targets",
    "region_targets","city_targets","size_targets",
    "max_lifetime_imps","max_day_imps"
]

class YoshiProfileHandler(BaseHandler):

    def initialize(self, db=None, api=None, **kwargs):
        self.db = db 
        self.api = api

    @decorators.formattable
    def get_content(self,data,advertiser_id):
        
        def default(self,data):
            o = Convert.df_to_json(data) 
            self.render("campaign.html",data=o,advertiser_id=advertiser_id,user_id=0)

        yield default, (data,)

    @decorators.deferred
    def defer_get_profile(self,advertiser_id,profile_id):
        URL = "/profile?advertiser_id=%s&id=%s" % (advertiser_id,profile_id)
        data = self.api.get(URL)
        profile = data.json['response']['profile']

        return profile

    @decorators.deferred
    def defer_modify_profile(self,advertiser_id,profile_id,profile):
        profile = {k:v for k,v in profile.items() if "targets" not in k or ("targets" in k and v != 0)}
        URL = "/profile?advertiser_id=%s&id=%s" % (advertiser_id,profile_id)
        data = self.api.put(URL,data=ujson.dumps({"profile":profile}))
        return data.json['response']

    @defer.inlineCallbacks
    def modify_profile(self,advertiser_id,profile_id,profile):
        profile = yield self.defer_modify_profile(advertiser_id,profile_id,profile)
        self.get_content(pandas.DataFrame([profile]),advertiser_id)

    @defer.inlineCallbacks
    def get_profile(self,advertiser_id,profile_id):
        profile = yield self.defer_get_profile(advertiser_id,profile_id)
        profile_df = pandas.DataFrame([profile])

        profile_df = profile_df[PROFILE_COLUMNS]

        self.get_content(profile_df,advertiser_id)
 
        
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        
        advertiser_id = self.current_advertiser
        profile_id = self.get_argument("id",False)
        if advertiser_id and profile_id: 
            self.get_profile(advertiser_id,profile_id)
        else:
            self.write("need to be logged in")
            self.finish()

    @tornado.web.asynchronous
    def put(self):
        advertiser_id = self.current_advertiser
        profile_id = self.get_argument("id",False)

        obj = ujson.loads(self.request.body)
        profile = obj.get("profile",False)
        
        if advertiser_id and profile_id and profile:
            self.modify_profile(advertiser_id,profile_id,profile)
        else:
            self.finish()

