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

define("port", default=9001, help="run on the given port", type=int)

from link import lnk
from handler import *
from handlers import *
from slackclient import SlackClient

SLACKTOKEN = "xoxp-2171079607-3074847889-26638050530-c10bb6093c"


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.rockerbox,
        "reporting": lnk.dbs.reporting,
        "api": lnk.api.console,
        "slack": SlackClient(SLACKTOKEN)
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/metrics', MetricsHandler, connectors),
        (r'/opt', OptimizationHandler, connectors),
        (r'/campaigntree', CampaignTreeHandler, connectors),
        (r'/line-item-metrics', LineItemHandler, connectors),
        (r'/lineitems', LineItemDashboardHandler, connectors),
        (r'/adjustments', AdjustmentHandler, connectors),
        (r'/funnel', OptFunnelHandler, connectors),
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

