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

#from campaign_lib.runner import *

class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("crushercache",False) 
        pass

    def get(self):
        saved = self.db.select_dataframe("select * from optimization")
        saved['last_activity'] = saved['last_activity'].map(lambda x: str(x)) 
        saved_json = saved.to_dict('records')

        scheduled = self.db.select_dataframe("select o.*, os.days, os.time from optimization_schedule os left join optimization o on o.id = os.optimization_id order by o.name, o.type")
        scheduled['last_activity'] = scheduled['last_activity'].map(lambda x: str(x)) 
        scheduled_json = scheduled.to_dict('records')

        self.render("index.html", saved=json.dumps(saved_json), saved_html=saved.to_html(), scheduled=scheduled_json, scheduled_html=scheduled.to_html())

class SaveHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("crushercache",False) 
        pass

    def post(self):
        body = json.loads(self.request.body)
        name = body['name']
        _type = body['type']
        advertiser = body['advertiser']
           
        self.db.execute("INSERT INTO optimization (advertiser_id,name,type,state) VALUES (%s,%s,%s,%s)", (advertiser,name,_type,self.request.body) )

        self.redirect("/")

class ScheduleHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("crushercache",False) 
        pass

    def post(self):
        body = json.loads(self.request.body)
        optimization_id = body['optimization']
        days = body['day']
        time = body['time']
           
        self.db.execute("INSERT INTO optimization_schedule (optimization_id,days,time) VALUES (%s,%s,%s)", ( optimization_id,",".join(days),",".join(time) ) )

        self.write(body)
        self.finish()


class CreateHandler(tornado.web.RequestHandler):

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

        self.render("create.html",campaign_templates=dd,profile_templates=pd,advertisers=ad)

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


        import campaign_lib.create.runner as runner
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

        advertisers = self.db.select_dataframe("select pixel_source_name, external_advertiser_id from advertiser where active = 1 and deleted = 0 and media_trader_slack_name is not null and running=1 and media = 1")
        ad = advertisers.to_dict('records')

        self.render("optimize.html",campaign_templates=dd,profile_templates=pd,advertisers=ad)

    def post(self):
        dd = json.loads(self.request.body)

        import campaign_lib.optimize.parse as parse
        dparams = parse.parse(dd)

        import campaign_lib.optimize.runner as runner
        runner.runner(dparams,dd['data'],self.api)


class ReportHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 
        self.api = kwargs.get("api",False) 

    def post(self):
        dd = json.loads(self.request.body)

        advertiser_id = dd['report_advertiser']
        dd = { "report":dd["report"] }

        import campaign_lib.report_helper as report_helper

        df = report_helper.get_report(advertiser_id, dd, self.api, self.db)
        if "venue" in df.columns:
            df['venue_id'] = df['venue'].map(lambda x: x.split(" ")[1])

        self.write(json.dumps(df.to_dict('records')))
        self.finish()




        


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "reporting": lnk.dbs.reporting,
        "crushercache": lnk.dbs.crushercache,

        "api": lnk.api.console
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/save', SaveHandler, connectors),
        (r'/schedule', ScheduleHandler, connectors),
        (r'/create', CreateHandler, connectors),
        (r'/optimize', OptimizeHandler, connectors),
        (r'/reporting', ReportHandler, connectors),


        (r'/static/(.*)', tornado.web.StaticFileHandler, {"path":"static"}),
        (r'/js/(.*)', tornado.web.StaticFileHandler, {"path":"../shared/js"}),

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

