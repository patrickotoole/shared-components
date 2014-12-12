
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver

import tornado.platform.twisted
tornado.platform.twisted.install()

from twisted.internet import reactor, protocol, defer, threads
from twisted.protocols import basic
from tornado.options import define, options, parse_command_line

from handlers import streaming, reporting, user
from handlers.advertiser import AdvertiserHandler

import handlers.admin as admin
from handlers.adminreport import AdminReportHandler
from lib.report.handlers import ReportingLogHandler

from lib.buffers.pixel_buffer import BufferedSocketFactory
from lib.buffers.view_buffer import ViewabilityBufferedFactory


import lib.hive as h
from lib.link_sql_connector import DBCursorWrapper
from link import lnk

import signal
import requests
import logging
import time
import os


requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1

define("port", default=8080, help="run on the given port", type=int)
define("listen_port", default=1234, help="run on the given port", type=int)
define("view_port", default=1235, help="run on the given port", type=int)


db = lnk.dbs.rockerbox
reporting_db = lnk.dbs.reporting
api = lnk.api.console
bidder = lnk.api.bidder
hive = h.Hive().hive

_redis = streaming._redis
track_buffer = streaming.track_buffer
view_buffer = streaming.view_buffer

buffers = {"track":track_buffer, "view":view_buffer}


def sig_handler(sig, frame):
    logging.warning('Caught signal: %s', sig)
    tornado.ioloop.IOLoop.instance().add_callback_from_signal(shutdown)

def shutdown():
    logging.info('Stopping http server')
    try:
        reactor.stop()
    except:
        pass
    server.stop()

    logging.info('Will shutdown in %s seconds ...', MAX_WAIT_SECONDS_BEFORE_SHUTDOWN)
    io_loop = tornado.ioloop.IOLoop.instance()

    deadline = time.time() + MAX_WAIT_SECONDS_BEFORE_SHUTDOWN

    def stop_loop():
        now = time.time()
        if now < deadline and (io_loop._callbacks or io_loop._timeouts):
            io_loop.add_timeout(now + 1, stop_loop)
        else:
            io_loop.stop()
            logging.info('Shutdown')
    stop_loop()

index = [
    (r'/admin/?', admin.index.IndexHandler),
    (r'/admin/index', admin.index.IndexHandler)
]

old_handlers = [
    (r'/debug', admin.lookback.DebugHandler),
    (r'/uid.*', admin.lookback.UIDHandler),
    (r'/lookback.*', admin.lookback.LookbackHandler)
]

admin_scripts = [
    (r'/api.*', admin.scripts.APIHandler, dict(db=db)),
    (r'/admin/pixel/?',admin.scripts.PixelHandler, dict(db=db,api=api,bidder=bidder)),
    
    
    (r'/admin/money.*',admin.scripts.MoneyHandler, dict(db=db,api=api)),
    (r'/admin/batch_request/new.*', admin.scripts.BatchRequestFormHandler, dict(db=db, api=api, hive=hive)),
    (r'/admin/batch_requests.*', admin.scripts.BatchRequestsHandler, dict(db=db, api=api, hive=hive)),
    (r'/admin/imps/?', admin.scripts.ImpsHandler, dict(db=db, api=api, hive=hive)),

    (r'/admin/viewable/?(.*?)/?(meta)/?',admin.scripts.ViewabilityHandler, dict(db=db,api=api)), 
    (r'/admin/viewable/?(.*?)/?',admin.scripts.ViewabilityHandler, dict(db=db,api=api)),  

    (r'/admin/campaign_check/fixtures/?(.*?)/?', admin.checks.FixtureHandler, dict(db=db)),   
    (r'/admin/campaign_check/suites/?(.*?)/?', admin.checks.SuiteHandler, dict(db=db)),   
    (r'/admin/campaign_check/relation/?(.*?)/?', admin.checks.CampaignRelationsHandler, dict(db=db)),  
    (r'/admin/campaign_check.xml', admin.checks.CircleCIXMLHandler ),   
    (r'/admin/campaign_check/?(.*?)/?', admin.checks.CampaignChecksHandler, dict(db=db)), 

]

admin_demographics = [
]

_streaming = [
    (r'/streaming', streaming.streaming.IndexHandler),
    (r'/websocket', streaming.streaming.StreamingHandler, dict(db=db,buffers=buffers))
]

admin_advertiser = [
    
    #(r'/admin/advertiser/new/?',admin.scripts.AdvertiserHandler, dict(db=db,api=api)),
    
    (r'/admin/advertiser/pixel/reporting/?', admin.reporting.AdvertiserPixelHandler, dict(db=db, hive=hive)),
    (r'/admin/advertiser/pixel/reporting/?(meta)?/?', admin.reporting.AdvertiserPixelHandler, dict(db=db, hive=hive)),
    (r'/admin/advertiser/pixel/geo/reporting/?', admin.reporting.AdvertiserPixelGeoHandler, dict(db=db, hive=hive)),
    (r'/admin/advertiser/pixel/geo/reporting/?(meta)?/?', admin.reporting.AdvertiserPixelGeoHandler, dict(db=db, hive=hive)),
    (r'/admin/advertiser/pixel/device/reporting/?', admin.reporting.AdvertiserPixelDeviceHandler, dict(db=db, hive=hive)),
    (r'/admin/advertiser/pixel/device/reporting/?(meta)?/?', admin.reporting.AdvertiserPixelDeviceHandler, dict(db=db, hive=hive)),

    (r'/admin/advertiser/served/geo/reporting/?', admin.reporting.AdvertiserServedGeoHandler, dict(db=db, hive=hive)),
    (r'/admin/advertiser/served/geo/reporting/?(meta)?/?', admin.reporting.AdvertiserServedGeoHandler, dict(db=db, hive=hive)),


    (r'/admin/advertiser/reporting/?', admin.reporting.AdvertiserReportingHandler, dict(db=db, hive=hive)), 
    (r'/admin/advertiser/viewable/reporting/?',admin.reporting.AdvertiserViewableHandler, dict(db=db,hive=hive)),
    (r'/admin/advertiser/viewable/reporting/?(.*?)/?',admin.reporting.AdvertiserViewableHandler, dict(db=db,hive=hive)), 

    (r'/admin/advertiser/summary/reporting/?',admin.reporting.AdvertiserSummaryHandler, dict(hive=hive)),
    (r'/admin/advertiser/summary/reporting/?(meta)?/?',admin.reporting.AdvertiserSummaryHandler, dict(hive=hive)),

    (r'/admin/advertiser/domain_list/streaming/?',admin.scripts.TargetingHandler, dict(redis=_redis,api=api,db=db)),
    (r'/admin/advertiser/domain_list/reporting/?',admin.reporting.DomainListHandler, dict(hive=hive)),
    (r'/admin/advertiser/domain_list/reporting/?(meta)?/?',admin.reporting.DomainListHandler, dict(hive=hive)),
    (r'/admin/advertiser/domain_list/?(.*?)/?',admin.target_list.TargetListHandler, dict(api=api,db=db)),  

    (r'/admin/advertiser/conversion/reporting/?',admin.reporting.ConversionCheckHandler, dict(hive=hive)) ,
    (r'/admin/advertiser/conversion/reporting/?(meta)?/?',admin.reporting.ConversionCheckHandler, dict(hive=hive)),
    (r'/admin/advertiser/click/reporting/?',admin.reporting.ClickCheckHandler, dict(hive=hive)) ,
    (r'/admin/advertiser/click/reporting/?(meta)?/?',admin.reporting.ClickCheckHandler, dict(hive=hive)),

    (r'/admin/advertiser/debug/reporting/?',admin.reporting.DebugReportingHandler, dict(hive=hive)),
    (r'/admin/advertiser/debug/reporting/?(meta)?/?',admin.reporting.DebugReportingHandler, dict(hive=hive)),
    (r'/admin/advertiser/conversion/imps/reporting/?',admin.reporting.ConversionImpsHandler, dict(hive=hive)) ,
    (r'/admin/advertiser/conversion/imps/reporting/?(meta)?/?',admin.reporting.ConversionImpsHandler, dict(hive=hive)),
    (r'/admin/advertiser/click/imps/reporting/?',admin.reporting.ClickImpsHandler, dict(hive=hive)) ,
    (r'/admin/advertiser/click/imps/reporting/?(meta)?/?',admin.reporting.ClickImpsHandler, dict(hive=hive)),
    (r'/admin/advertiser/segment/?(.*?)/?',admin.segment.SegmentHandler, dict(db=db, api=api)), 
    (r'/admin/advertiser/viewable/?(.*?)/?',admin.advertiser.AdvertiserViewableHandler, dict(db=db,api=api)),
    (r'/admin/advertiser/?(.*?)',admin.scripts.AdvertiserHandler, dict(db=db,api=api)) 
]

admin_appnexus = [
    (r'/admin/appnexus/campaign/?', admin.appnexus.CampaignHandler, dict(db=db, api=api))
]

admin_domain = [
    (r'/admin/optimization/domain/?', admin.optimization.DomainListHandler, dict(db=db, api=api, hive=hive)), 
    (r'/admin/domain/categories/reporting/?', admin.reporting.DomainCategoriesHandler, dict(db=db, api=api, hive=hive)),
    (r'/admin/domain/categories/reporting/?(meta)?/?', admin.reporting.DomainCategoriesHandler, dict(db=db, api=api, hive=hive)),
    (r'/admin/domain/reporting/?', admin.reporting.DomainHandler, dict(db=db, api=api, hive=hive)),
    #(r'/admin/domain/reporting/(timeseries)/(meta)/?', admin.reporting.DomainHandler, dict(db=db, api=api, hive=hive)),
    (r'/admin/domain/reporting/?(.*?)/?', admin.reporting.DomainHandler, dict(db=db, api=api, hive=hive))
      
]

admin_reporting = [
    
    (r'/admin/streaming',admin.streaming.IndexHandler),
    (r'/admin/websocket', admin.streaming.AdminStreamingHandler, dict(db=db,buffers=buffers)),
    (r'/admin/viewable/reporting.*',admin.reporting.ViewabilityHandler, dict(db=db,api=api,hive=hive)),

    (r'/admin/intraweek.*',admin.scripts.IntraWeekHandler, dict(db=db)),
    (r'/admin/report/(.*?)/.*', AdminReportHandler),
    (r'/admin/reportinglog/(.*?)', ReportingLogHandler),
    (r'/admin/event_log',admin.scripts.EventLogHandler, dict(db=reporting_db,api=api)),
    (r'/admin/event_log/(.*?)',admin.scripts.EventLogHandler, dict(db=reporting_db,api=api)),
    
    (r'/admin/segment/reporting/?',admin.reporting.SegmentReportingHandler, dict(hive=hive)),   
    (r'/admin/segment/scrubbed/?',admin.scripts.ProfileHandler, dict(bidder=bidder)),  
    (r'/admin/segment/scrubbed/(.*?)',admin.scripts.ProfileHandler, dict(bidder=bidder)),
    
    (r'/admin/imps/reporting', admin.reporting.ImpsReportingHandler, dict(db=db, api=api, hive=hive)),
 
    (r'/admin/census/age_gender/?(.*?)/?', admin.reporting.AgeGenderCensusHandler, dict(hive=hive)),
    (r'/admin/census/age_gender/?(.*?)/?(meta)/?', admin.reporting.AgeGenderCensusHandler, dict(hive=hive)),

    (r'/admin/census/income/?(.*?)/?', admin.reporting.IncomeCensusHandler, dict(hive=hive)),
    (r'/admin/census/income/?(.*?)/?(meta)/?', admin.reporting.IncomeCensusHandler, dict(hive=hive)),

    (r'/admin/census/race/?(.*?)/?', admin.reporting.RaceCensusHandler, dict(hive=hive)),
    (r'/admin/census/race/?(.*?)/?(meta)/?', admin.reporting.RaceCensusHandler, dict(hive=hive))
   
] + admin_advertiser

reporting = [
    (r'/', user.LoginHandler, dict(db=db)),
    (r'/reporting.*',reporting.ReportingHandler, dict(db=db,api=api,hive=hive)),
    (r'/creative/reporting.*', reporting.CreativeReportingHandler, dict(db=db,api=api,hive=hive)),
    (r'/domain/reporting.*', reporting.DomainReportingHandler, dict(db=db,api=api,hive=hive)), 
    (r'/conversion/reporting.*', reporting.ConversionReportingHandler, dict(db=db,api=api,hive=hive)),  
    (r'/login.*', user.LoginHandler, dict(db=db)),
    (r'/signup*', user.SignupHandler, dict(db=db)),
    (r'/intraweek.*',reporting.InsertionOrderHandler, dict(db=db)),
    (r'/advertiser',AdvertiserHandler, dict(api=api,db=db)), 
]


static = [
    (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': "static"})
]

dirname = os.path.dirname(os.path.realpath(__file__))
app = tornado.web.Application(
    _streaming + admin_scripts + admin_reporting + admin_domain + reporting + static + index + admin_appnexus,
    template_path= dirname + "/templates",
    debug=True,
    cookie_secret="rickotoole",
    login_url="/login"
)

if __name__ == '__main__':
    parse_command_line()
    reactor.listenTCP(options.listen_port, streaming.track_factory)
    reactor.listenTCP(options.view_port, streaming.view_factory)

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()
