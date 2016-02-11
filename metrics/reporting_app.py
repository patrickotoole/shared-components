import tornado.ioloop
import tornado.web
import tornado.httpserver
import logging
import redis


from tornado.options import define, options, parse_command_line
from lib.link_sql_connector import DBCursorWrapper
from link import lnk

from lib.hive import Hive
from handlers.reporting import ReportingHandler

import tornado.platform.twisted
tornado.platform.twisted.install()


requests_log = logging.getLogger("requests")
requests_log.setLevel(logging.WARNING)

MAX_WAIT_SECONDS_BEFORE_SHUTDOWN = 1

define("port", default=8081, help="run on the given port", type=int)


db = lnk.dbs.mysql
hive = Hive().hive
#_redis = redis.StrictRedis(host='162.243.123.240', port=6379, db=1)
_redis = redis.StrictRedis(host='10.128.201.81', port=6379, db=1)

app = tornado.web.Application([
    (r'/reporting.*',ReportingHandler, dict(db=db,api=None,hive=hive))
],debug=True)


if __name__ == '__main__':
    parse_command_line()

    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    tornado.ioloop.IOLoop.instance().start()
