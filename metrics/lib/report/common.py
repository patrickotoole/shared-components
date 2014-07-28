"""
python common.py --report=domain --group=advertiser,site_domain --limit=10 --metrics=best --pred='media_cost<20,booked_revenue>100'
python common.py --report=datapulling --cache --act
python common.py --report=converstions --cache --act --end_date=2014-07-14 --lookback=1
"""

import glob
import os
from pprint import pprint
import sys
import inspect

from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line
import tornado.web
import tornado.httpserver

from lib.report.base import ReportDomainHandler

LIMIT = 5
WORST = 'worst'

def get_report_obj(report):
    name = filter(str.isalnum, str(report).lower())
    if not os.path.dirname(__file__) in sys.path:
        sys.path.append(os.path.dirname(__file__))
    os.chdir(os.path.dirname(__file__) or '.')
    for f in glob.glob("*.py"):
        f = os.path.splitext(f)[0]
        if name == f:
            _module = __import__(f)
            for member_name, obj in inspect.getmembers(_module):
                name = ('report' + report).lower()
                if inspect.isclass(obj) and member_name.lower() == name:
                    return obj(report)
    raise ValueError("Can't for related report file")

def run_server(port,
        report_obj=None,
        name=None,
        ):
    app = tornado.web.Application([
        (r'/reportdomain/*', ReportDomainHandler, dict(name=name,
                                                       report_obj=report_obj)),
        ], debug=True)
    server = tornado.httpserver.HTTPServer(app)
    server.listen(port)
    tornado.ioloop.IOLoop.instance().start()


def main():
    define('report')
    define('group',
            help="choices: site_domain, advertise,site_domain, or advertise,site_domain,campaign",
            type=str,
            default='site_domain',
            )
    define('act', type=bool, default=False, help='if read from cache, act will create csv file if file not exist')
    define('path', help='where to put tmp csv file')
    define('pred', type=str, help='predicats, campaign#bob,media_cost>10')
    define('limit', type=int, default=LIMIT)
    define('lookback',
            help='how many days/hours from the end date',
            type=int,
            default=1,
            )
    define('end_date', help='end date, examples: 2014-07-15',)
    define("runserver", type=bool, default=False)
    define("port", default=8081, help="run on the given port", type=int)
    define("cache", type=bool, default=False, help="use cached csv file or api data")
    define("metrics", type=str, default=WORST)

    parse_command_line()

    report = options.report
    group = options.group
    act = options.act
    path = options.path
    pred = options.pred
    limit = options.limit
    lookback = options.lookback
    end_date = options.end_date
    runserver = options.runserver
    port = options.port
    cache = options.cache
    metrics = options.metrics

    report_obj = get_report_obj(report)

    if runserver:
        run_server(port, report_obj=report_obj, name=report)
        return

    result = report_obj.get_report(
            group=group,
            limit=limit,
            path=path,
            act=act,
            cache=cache,
            end_date=end_date,
            lookback=lookback,
            metrics=metrics,
            pred=pred,
            )
    if act:
        report_obj._work(result)
    else:
        pprint(result)

if __name__ == '__main__':
    exit(main())
