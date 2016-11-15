import tornado
from link import lnk
from handlers import *
import os
import tornado.httpserver
from adwords import AdWords
from tornado.options import define, options, parse_command_line

dirname = os.path.dirname(os.path.realpath(__file__))
static_dir = os.path.dirname(os.path.realpath(__file__))


if __name__ == "__main__":
    define("port", default=9001, help="run on the given port", type=int)

    parse_command_line()
    connectors = {
    "db" : lnk.dbs.rockerbox,
    }

    adwords = AdWords(connectors)

    connectors['adwords'] = adwords

    routes = [
            (r'/', IndexHandler, connectors),
            (r'/index', IndexHandler, connectors),
            (r'/authorize', AuthorizeHandler, connectors),
            (r'/callback', CallbackHandler, connectors),
            (r'/campaign', CampaignHandler, connectors),
            (r'/campaign/form', CampaignFormHandler, connectors),
            (r'/campaign/([0-9]+)/schedule', ScheduleHandler, connectors),
            (r'/report', ReportHandler, connectors),
            (r'/account', AccountHandler, connectors),
            (r'/adgroup', AdGroupHandler, connectors),
            (r'/adgroup/form', AdGroupFormHandler, connectors),
            (r'/adgroup/([0-9]+)/keyword', KeywordHandler, connectors),
            (r'/placement', PlacementHandler, connectors),
            (r'/placement/form', PlacementFormHandler, connectors),
            (r'/manage', ManageHandler, connectors),
            (r'/customer', CustomerHandler, connectors),
            (r'/media', MediaHandler, connectors),
            (r'/ads', AdHandler, connectors),
            (r'/budget', BudgetHandler, connectors),
            (r'/login', LoginHandler, connectors),
            (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static_dir+"/static"})
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
