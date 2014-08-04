"""
python common.py --report=domain --group=advertiser,site_domain --limit=10 --metrics=best --pred='media_cost<20,booked_revenue>100'
python common.py --report=datapulling --cache --act
python common.py --report=converstions --cache --act --end_date=2014-07-14 --lookback=1
"""

from pprint import pprint

from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line

from lib.report.work.report import ReportWorker
from lib.report.reportutils import get_report_obj
from lib.report.reportutils import get_db
from lib.report.utils.constants import WEI_EMAIL, RON_EMAIL
from lib.report.emails import send_domain_email

LIMIT = 5
WORST = 'worst'

def main():
    define('report')
    define('group',
            help="choices: site_domain, advertise,site_domain, or advertise,site_domain,campaign",
            type=str,
            )
    define('act', type=bool, default=False, help='if read from cache, act will create csv file if file not exist')
    define('path', help='where to put tmp csv file')
    define('pred', type=str, help='predicats, campaign#bob,media_cost>10')
    define('limit', type=int)
    define('lookback',
            help='how many hours from the end date',
            type=int,
            default=1,
            )
    define('end_date', help='end date, examples: 2014-07-15',)
    define("cache", type=bool, default=False, help="use cached csv file or api data")
    define("metrics", type=str, default=WORST)
    define("db", type=str, default='test', help="choose which database to write to")
    define("email", type=bool, default=False, help="whether to email or not")
    define("to", type=str, help="email reciever")

    parse_command_line()

    name = options.report
    group = options.group
    act = options.act
    path = options.path
    pred = options.pred
    limit = options.limit
    lookback = options.lookback
    end_date = options.end_date
    cache = options.cache
    metrics = options.metrics
    kwargs = dict(
            group=group,
            limit=limit,
            path=path,
            cache=cache,
            end_date=end_date,
            lookback=lookback,
            metrics=metrics,
            pred=pred,
            )
    db = get_db(options.db)
    if not act:
        report_obj = get_report_obj(name, db=db)
        result = report_obj.get_report(**kwargs)
        if options.email:
            _email = [WEI_EMAIL] + [options.to]
            from lib.report.utils.utils import get_dates
            start_date, end_date = get_dates(end_date=end_date, lookback=lookback)
            send_domain_email(_email, result, metrics,
                    start_date=start_date,
                    end_date=end_date,
                    limit=limit,
                    )
        pprint(result)
    else:
        ReportWorker()._work(name, db, **kwargs)
        return

if __name__ == '__main__':
    exit(main())
