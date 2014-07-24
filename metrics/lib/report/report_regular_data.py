"""
cron script runs hourly to pull following data
    hour
    line_item
    campaign
    creative
    advertiser
    - Clicks
    - Imps
    - Media Cost
    adx_spend
"""

import pandas as pd
from pprint import pprint

from datetime import timedelta
from lib.report.utils.utils import get_start_and_end_date
from lib.report.report_domain import _get_report_helper
from lib.report.request_json_forms import ADVERTISER_IDS

import tornado.web
import tornado.httpserver

DATA_PULL = 'datapulling'
LIMIT = 1
GOOGLE_ADX = 'Google AdExchange (181)'

def _report(path=None,
        act=False,
        cache=False,
        start_date=None,
        end_date=None,
        limit=None,
        ):
    if not (start_date and end_date):
        dates = get_start_and_end_date(end_date=end_date,
                                       _timedelta=timedelta(hours=1))
        start_date, end_date = dates.get('start_date'), dates.get('end_date')
    ids = ADVERTISER_IDS
    dfs = []
    for _id in ids:
        df = _get_report_helper(
                group=DATA_PULL,
                path=path,
                act=act,
                cache=cache,
                start_date=start_date,
                end_date=end_date,
                advertiser_id=_id,
                )
        dfs.append(df)
        if limit and len(dfs) >= limit:
            break
    dfs = pd.concat(dfs)
    return dfs

def _analyze(df):
    grouped = df.groupby(['hour',
                          'advertiser_id',
                          'line_item_id',
                          'campaign_id',
                          'creative_id',
                          'seller_member',
                          ])
    res = grouped[['imps', 'clicks', 'media_cost']].sum()
    res = res.xs(GOOGLE_ADX, level="seller_member").reset_index()
    return res

def report(path=None, act=False, cache=False,
        start_date=None,
        end_date=None,
        limit=None,
        ):

    dfs = _report(path=path,
                 act=act,
                 cache=cache,
                 start_date=start_date,
                 end_date=end_date,
                 limit=limit,
                 )
    result = _analyze(dfs)
    return result

def main():
    from tornado.options import define
    from tornado.options import options
    from tornado.options import parse_command_line

    define('path',
            help='where to put tmp csv file')
    define('act',
            type=bool,
            default=False)
    define('limit',
            help='lines of result',
            type=int,
            default=LIMIT,
            )
    define('end_date',
            help='end date, examples: 2014-07-15',
            )
    define('start_date',
            help='start date, examples: 2014-07-15',
            )
    define("runserver", type=bool, default=False)
    define("port", default=8081, help="run on the given port", type=int)
    define("cache", type=bool, default=False, help="use cached csv file or api data")

    parse_command_line()

    result = report(
            path=options.path,
            act=options.act,
            cache=options.cache,
            start_date=options.start_date,
            end_date=options.end_date,
            limit=options.limit,
           )
    if options.act:
        pass
    else:
        pprint(result)

if __name__ == '__main__':
    exit(main())
