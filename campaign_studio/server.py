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


class OptimizeHandler(tornado.web.RequestHandler):

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

        self.render("optimize.html",campaign_templates=dd,profile_templates=pd,advertisers=ad)

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


class ReportHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 
        self.api = kwargs.get("api",False) 

    def post(self):
        dd = json.loads(self.request.body)

        advertiser_id = dd['report_advertiser']
        dd = { "report":dd["report"] }

        start_date = '2016-10-01 00:00:00'
        end_date = '2016-11-02 00:00:00'

        from lib.appnexus_reporting.appnexus import AppnexusReport

        import hashlib
        m = hashlib.md5()
        m.update(json.dumps(dd))

        digest = str(m.hexdigest())

        report_wrapper = AppnexusReport(self.api, self.db, advertiser_id, start_date, end_date, "custom-" + digest)
        report_id = report_wrapper.request_report(advertiser_id,json.dumps(dd) % {"start_date":start_date,"end_date":end_date})
        report_url = report_wrapper.get_report(report_id)
        report_IO = report_wrapper.download_report(report_url)
        
        import pandas
        df = pandas.read_csv(report_IO)
        if "venue" in df.columns:
            df['venue_id'] = df['venue'].map(lambda x: x.split(" ")[1])

        self.write(json.dumps(df.to_dict('records')))
        self.finish()




        


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "reporting": lnk.dbs.reporting,

        "api": lnk.api.console
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/optimize', OptimizeHandler, connectors),
        (r'/reporting', ReportHandler, connectors),


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
