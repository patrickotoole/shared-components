import tornado.web
import ujson
import json
import pandas
import StringIO

from twisted.internet import defer 
from lib.helpers import *
from functools import partial

API_QUERY = "select * from %s where %s "

class CampaignHandler(tornado.web.RequestHandler):

    def initialize(self, db, api):
        self.db = db 
        self.api = api

    @decorators.deferred
    def defer_put_object(self,url,data):
        response = self.api.put(url,data).json['response']
        print response
        import time
        time.sleep(1)
        return response
        


    
    @decorators.deferred
    def defer_get_campaign(self,_id,include=[],fields=[]):
        print _id
        campaign = self.api.get("/campaign?id=%s" % _id).json['response']['campaign']
        obj = {}
        obj['campaign'] = campaign

        if "profile" in include: 
            profile = self.api.get("/profile?id=%s" % campaign['profile_id']).json['response']['profile']
            obj['profile'] = profile

        if "line_item" in include: 
            line_item = self.api.get("/line-item?id=%s" % campaign['line_item_id']).json['response']['line-item']
            obj['line-item'] = line_item
         

        if len(fields) > 0 and fields[0] != "": 
            obj['campaign'] = {k:v for k,v in campaign.iteritems() if k in fields}
            if "profile" in include: 
                obj['profile'] =  {k:v for k,v in profile.iteritems() if k in fields} 
            if "line_item" in include: 
                obj['line-item'] =  {k:v for k,v in line_item.iteritems() if k in fields} 

        import time
        time.sleep(1.1)
             
        return obj

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            self.set_header("Content-type","text/javascript")
            self.write(json.dumps(data,indent=4))
            self.finish()

        yield default, (data,)


    @defer.inlineCallbacks 
    def get_campaign(self,_ids,include,fields,callback):
        campaigns = []
        for _id in _ids:
            campaign = yield self.defer_get_campaign(_id,include,fields)
            if campaign is not None:
                campaigns += [campaign] 

        callback(campaigns)

    @defer.inlineCallbacks
    def put_campaign(self,obj,data,campaigns):
        if obj == "campaign":
            key = "id"
            object_key = "campaign"
            url = "/campaign?id=%s&advertiser_id=%s" 
        elif obj == "profile":
            key = "profile_id"
            object_key = "profile"
            url = "/profile?id=%s&advertiser_id=%s" 
        elif obj == "line item":
            key = "line_item_id"
            object_key = "line-item"
            url = "/line-item?id=%s&advertiser_id=%s"

        responses = []
        for campaign in campaigns:
            c = campaign['campaign']
            _d = """{"%s":%s}""" % (object_key,data)
            _obj = yield self.defer_put_object(url % (c[key],c['advertiser_id']),_d)
            responses += [_obj]
                     
        self.write(str(responses))
        self.finish()


    @tornado.web.asynchronous
    def get(self):
        _ids = self.get_argument("id","").split(",")
        include = self.get_argument("include","").split(",")
        fields = self.get_argument("fields","").split(",")
        print _ids
        if len(_ids) > 0 and _ids[0] != "":
            campaigns = self.get_campaign(_ids,include,fields,self.get_content)
        else:
            self.render("admin/campaign/index.html")
            #self.finish()
        


    @tornado.web.asynchronous
    def put(self):
        body = ujson.loads(self.request.body)
        campaign_ids = body['campaign_ids']
        edit_object = body['object']
        put_string = body['content']

        try:
            ujson.loads(put_string)
        except:
            self.set_status("404","bad content format")
            self.finish()
            return
       

        put_campaign = partial(self.put_campaign,edit_object,put_string)
        
        self.get_campaign(campaign_ids,[],[],put_campaign)



