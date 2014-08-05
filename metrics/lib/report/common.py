"""
python common.py --report=domain --group=advertiser,site_domain --limit=10 --metrics=best --pred='media_cost<20,booked_revenue>100'
python common.py --report=datapulling --cache --act
python common.py --report=converstions --cache --act --end_date=2014-07-14 --lookback=1
"""

import re
from pprint import pprint
from datetime import timedelta

from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line

from lib.report.utils.utils import parse
from lib.report.utils.utils import align
from lib.report.utils.utils import datetime_to_str
from lib.report.utils.utils import TIME_DELTA_REGEX
from lib.report.work.report import ReportWorker
from lib.report.reportutils import get_report_obj
from lib.report.reportutils import get_db

LIMIT = 5
WORST = 'worst'

def _get_start_end_date(start_date=None, end_date=None):
    """
    @param start_date|end_date: str('1m'|'1h'|'1d|2014-07-14')
    @return: str('2014-07-14 00:00:00')
    """
    _td = timedelta(hours=1)

    def _f(t):
        return align(_td, parse(t))
    def _is_delta(t):
        return TIME_DELTA_REGEX.search(t)

    if _is_delta(end_date):
        end_date = _f(end_date)
        start_date = _f(start_date)
        return datetime_to_str(start_date), datetime_to_str(end_date)
    else:
        return start_date, end_date

def main():
    define('report')
    define('group',
            help="choices: site_domain|advertise,site_domain|advertise,site_domain,campaign",
            type=str,
            )
    define('act', type=bool)
    define('path', help='where to find csv file')
    define("cache", type=bool, default=False, help="find or create cache csv file")
    define('pred', type=str, help='predicats, campaign#bob,media_cost>10')
    define('limit', type=int)
    define('start_date', default='5h')
    define('end_date', default='4h')
    define("metrics", type=str, default=WORST)
    define("db", type=str, default='test', help="choose which database to write to")

    parse_command_line()

    name = options.report
    group = options.group
    act = options.act
    path = options.path
    cache = options.cache
    pred = options.pred
    limit = options.limit
    start_date, end_date = _get_start_end_date(options.start_date, options.end_date)
    metrics = options.metrics
    kwargs = dict(
            group=group,
            path=path,
            cache=cache,
            start_date=start_date,
            end_date=end_date,
            metrics=metrics,
            pred=pred,
            limit=limit,
            )
    db = get_db(options.db)
    if not act:
        report_obj = get_report_obj(name, db=db)
        result = report_obj.get_report(**kwargs)
        pprint(result)
    else:
        ReportWorker()._work(name, db, **kwargs)
        return

if __name__ == '__main__':
    exit(main())
