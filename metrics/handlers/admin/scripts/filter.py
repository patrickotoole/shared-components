import tornado.web
import ujson
import json
import pandas
import StringIO
import logging

from twisted.internet import defer 
from lib.helpers import *

class FilterHandler(tornado.web.RequestHandler):

    def initialize(self, bidder=None,do=None,marathon=None, db=None, redis=None, reporting_db=None):
        self.marathon = marathon
        self.db = db
        self.redis = redis

    @decorators.deferred
    def defer_post_domain(self,domain):
        logging.info("inserting new delorean domain: %s" % domain)
        return self.db.execute("INSERT INTO domain_list (segment, log, pattern) VALUES ('delorean:0', 'delorean', '%s')" % domain)
 
    @decorators.deferred
    def update_profile(self):
        logging.info("updating data_provider redis profile")
        df = self.get_targets("active = 1")
        content = Convert.df_to_json(df)
        return self.redis.set("profile",content)

    def get_targets(self,where="1=1"):
        df = self.db.select_dataframe("SELECT * FROM domain_list WHERE %s" % where)
        df = df.set_index("id")
        return df


    @decorators.deferred
    def defer_get_domains(self):
        return self.db.select_dataframe("SELECT * from domain_list where segment like 'delorean%%'")

    @decorators.deferred
    def defer_get_available(self):
        return self.marathon.get("/v2/apps/akka-tree-filter").json['app']['tasks']
    
    @defer.inlineCallbacks 
    def get_listeners(self):
        available = yield self.defer_get_available()
        server = "http://" + available[0]['host'] + ":9999"

        self.render("../templates/admin/filter.html",server=server)

    @defer.inlineCallbacks
    def get_domains(self):
        domains = yield self.defer_get_domains()
        self.write(domains.to_html())
        self.write("""
        <form method="POST">
          <label>Add Domain</label>
          <input name="pattern"></input>
          <input type="submit" value="Submit"></input>
        </form>
        """)
        self.finish()
    
    @tornado.web.asynchronous
    def get(self,*args):
        if args and args[0] == "streaming":
            self.render("../templates/admin/bubble_filter.html")
        elif args and args[0] == "sankey":
            print "HERE"
            self.render("../templates/admin/sankey_filter.html")
        elif args and args[0] == "domains":
            self.get_domains()
        else:
            self.get_listeners()

    @defer.inlineCallbacks
    def post_domain(self,domain):
        response = yield self.defer_post_domain(domain)
        update = yield self.update_profile()
        self.redirect(self.request.uri)

    @tornado.web.asynchronous
    def post(self,*args):
        pattern = self.get_argument("pattern")
        self.post_domain(pattern)

        
