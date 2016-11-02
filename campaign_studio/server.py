import tornado.websocket
import os
import logging
import json

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.platform.twisted

tornado.platform.twisted.install()

from twisted.internet import reactor
from shutdown import sig_wrap
from tornado.options import define, options, parse_command_line

dirname = os.path.dirname(os.path.realpath(__file__))

define("port", default=9003, help="run on the given port", type=int)

from link import lnk

from src.runner import *

class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False) 
        pass

    def get(self):
        logging.info("got index")
        df = self.db.select_dataframe("select name, template from campaign_templates where active = 1 and deleted = 0")
        dd = df.to_dict('records')

        profile = self.db.select_dataframe("select name, template, type, required_columns from profile_templates where active = 1 and deleted = 0")
        pd = profile.to_dict('records')

        advertisers = self.db.select_dataframe("select pixel_source_name, external_advertiser_id from advertiser where active = 1 and deleted = 0 and media_trader_slack_name is not null")
        ad = advertisers.to_dict('records')

        self.render("index.html",campaign_templates=dd,profile_templates=pd,advertisers=ad)

    def post(self):
        dd = json.loads(self.request.body)
        data = dd['data']
        fields = dd['fields']

        CAMPAIGN_TYPE = dd['template']
        LINE_ITEM = int(dd['line_item'])
        ADVERTISER = int(dd['advertiser'])

        assert LINE_ITEM > 100
        assert ADVERTISER > 100

        assert len(fields) > 0 
        assert len(data) > 0 


        import src.runner as runner
        runner.runner(CAMPAIGN_TYPE,LINE_ITEM,ADVERTISER,data,fields)


class DuplicateHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False) 
        self.api = kwargs.get("api",False) 

    def get(self):
        logging.info("got index")
        df = self.db.select_dataframe("select name, template from campaign_templates where active = 1 and deleted = 0")
        dd = df.to_dict('records')

        profile = self.db.select_dataframe("select name, template, type, required_columns from profile_templates where active = 1 and deleted = 0")
        pd = profile.to_dict('records')

        advertisers = self.db.select_dataframe("select pixel_source_name, external_advertiser_id from advertiser where active = 1 and deleted = 0 and media_trader_slack_name is not null")
        ad = advertisers.to_dict('records')

        self.render("duplicate.html",campaign_templates=dd,profile_templates=pd,advertisers=ad)

    def post(self):
        dd = json.loads(self.request.body)
        data = dd['data']
        params = dd['params']


        dparams = { i['key'] : i.get('value',0) for i in params }



        append = (dparams['append'] == "Append")
        dparams['append'] = append

        LINE_ITEM_ID = dparams['line_item_id']
        ADVERTISER = dparams['advertiser']

        duplicate = (dparams['duplicate'] == "Duplicate")
        dparams['modify'] = (dparams['duplicate'] == "Modify")
        dparams['create'] = (dparams['duplicate'] == "Create")

        dparams['duplicate'] = True if dparams['create'] else duplicate
        

        breakout = (dparams['breakout'] == "Breakout")
        dparams['breakout'] = breakout





        import src.copy  as copy
        import ipdb; ipdb.set_trace()
        copy.runner(dparams,LINE_ITEM_ID,ADVERTISER,data,"blank",self.api)


        


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "api": lnk.api.console
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/duplicate', DuplicateHandler, connectors),

        (r'/static/(.*)', tornado.web.StaticFileHandler, {"path":"static"}),
    ]

    app = tornado.web.Application(
        routes, 
        template_path= dirname,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    
    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    tornado.ioloop.IOLoop.instance().start()