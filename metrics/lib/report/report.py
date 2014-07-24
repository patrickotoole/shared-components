"""
report the least effective campins/advertiser/domain etc.
"""

import logging
import os
import re
from datetime import timedelta
import io
import urllib

from pprint import pprint
import pandas as pd
from link import lnk
from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line
import tornado.web
import tornado.httpserver

from utils import retry
from utils import local_now
from utils import convert_datetime
from utils import parse_params
from handlers.reporting import ReportingHandler
from lib.helpers import decorators

from request_json_forms import DOMAIN_JSON_FORM
from request_json_forms import ADVERTISER_JSON_FORM
from request_json_forms import CAMPAIGN_JSON_FORM
from request_json_forms import ADVERTISER_DOMAIN_JSON_FORM
from request_json_forms import ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM


"media cost under this amount is truncated"
THRESHOLD = 7

"metrics"
WORST = 'worst'
BEST = 'best'

NUM_TRIES = 10
LIMIT = 10
SLEEP = 1

"ndigit to round"
NDIGITS = 2

"set it to avoid, no division error or Inf values"
DAMPING_POINT = 0.

"value of inf cpas should be"
CPA_INF = 0

MILLION = 1000000
NO_CONVS = None
CUR_DIR = os.path.dirname(__file__)

TYPE = 'network_analytics'
CONSOLE = None

COST_EFFICIENCY = 'cost_efficiency'
DOMAIN = 'site_domain'
BOOKED_REV = 'booked_revenue'
PC_CONVS = 'post_click_convs'
PV_CONVS = 'post_view_convs'
MEDIA_COST = 'media_cost'
CPA = 'cpa'
HEADERS = [
        MEDIA_COST,
        CPA,
        ]

GROUPS = [
    'site_domain',
    'campaign',
    'advertiser',
 ]


REGEX = re.compile(r'\(.*?\)')

def _get_path(name):
    path = ('csv_file/%s.csv' % name).lower()
    return os.path.join(CUR_DIR, path)

def _get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    console = lnk.api.console
    logging.info("created a api console")
    CONSOLE = console
    return console

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='reconnecting and get refresh response')
def _get_resp(url, method='get', forms=None):
    c = _get_or_create_console()
    if method == 'get':
        resp = c.get(url)
    else:
        resp = c.post(url, forms)
    return resp

def _truncate(df, threshold):
    """
    cut out certain data there is less relevant.
    """
    df = df[df[MEDIA_COST] > int(threshold)]
    return df

def _convert_inf_cpa(df):
    inf_cpas = df[df['cpa'] > MILLION]
    inf_cpas['cpa'] = CPA_INF
    non_inf_cpas = df[df['cpa'] < MILLION]
    df = pd.concat([inf_cpas, non_inf_cpas])
    return df

def _sort_df_by_cpa(df, metrics=WORST):
    """
    given pandas frame, sort them by cpa or media cost if there is no convertions.
    """
    df['convs'] = df[PC_CONVS] + df[PV_CONVS]
    df['cpa'] = df[MEDIA_COST] / (df['convs'] + DAMPING_POINT)
    df_no_convs = df[df['convs'] == 0]
    df_have_convs = df[df['convs'] != 0]

    if metrics == WORST:
        df_no_convs = df_no_convs.sort('media_cost', ascending=False)
        df_have_convs = df_have_convs.sort('cpa', ascending=False)
        df = pd.concat([df_no_convs, df_have_convs])
        df = df.reset_index(drop=True)
    else:
        #sort by cost/revenue for now
        df[COST_EFFICIENCY] = df[MEDIA_COST] / df[BOOKED_REV]
        df = df[df[BOOKED_REV] > 0]
        df = df.sort(COST_EFFICIENCY)
    return df

def _create_csv(text, path):
    with open(path, 'w') as f:
        f.write(text)
    return path

def _resp_to_df(resp):
    df = pd.read_csv(io.StringIO(unicode(resp)))
    return df

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='no report id detected, reconnecting',
       )
def _get_report_id(request_json_form):
    url = '/report?'
    resp = _get_resp(url, method='post', forms=request_json_form)
    json_ = resp.json
    report_id = json_.get('response').get('report_id')
    logging.info("Got report id: %s" % report_id)
    assert report_id
    return report_id

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='retrying getting url',
       )
def _get_report_url(report_id):
    #have to get the reponse for other function to work
    url = '/report?id={report_id}'.format(report_id=report_id)
    resp = _get_resp(url)
    url = resp.json.get('response').get('report').get('url')
    assert url
    logging.info("report url is: %s" % url)
    return url

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='retrying getting resp',
       )
def _get_report_resp(url):
    logging.info("getting url: %s" % url)
    if not url.startswith('/'):
        url = '/' + url
    resp = _get_resp(url)
    return resp.text

def _get_start_and_end_date(end, days=1):
    if not end:
        end = local_now()
    if isinstance(end, str):
        end = convert_datetime(end)
    start = end - timedelta(days=days)
    return dict(start=str(start), end=str(end))

def get_report(group=DOMAIN,
        campaign=None,
        advertiser=None,
        limit=LIMIT,
        threshold=THRESHOLD,
        path=None,
        act=False,
        end_date=None,
        cache=False,
        days=1,
        metrics=WORST,
        ):
    """
    form: json request form
    group: domain | campaign | advertiser
    path: path to csv file, for test.
    """
    logging.info("getting report for group: %s" % group)

    if cache:
        path = _get_path(group)

    if path:
        df = pd.read_csv(path)

    else:
        dates = _get_start_and_end_date(end_date, days)
        start_date, end_date = dates.get('start'), dates.get('end')
        logging.info("getting data from date: %s -- %s." % (start_date, end_date))

        request_form = _get_forms(group=group, start_date=start_date, end_date=end_date)
        _id = _get_report_id(request_form)
        url = _get_report_url(_id)
        resp = _get_report_resp(url)
        df = _resp_to_df(resp)

        if act:
            path = _get_path(group)
            _create_csv(resp, path)

    if campaign:
        df = _specify_field(df, 'campaign', campaign)
    if advertiser:
        df = _specify_field(df, 'advertiser', advertiser)

    df = _sort_df_by_cpa(df, metrics=metrics)
    df = _convert_inf_cpa(df)
    truncated_df = _truncate(df, threshold=threshold)
    return truncated_df[:limit]

def _specify_field(df, field, value):
    """
    select only specified campaign or advertiser
    """
    is_specified = df[field] == value
    return df[is_specified]

def send_email():
    pass

def _get_forms(group=None,
        start_date=None,
        end_date=None,
        ):
    form = (DOMAIN_JSON_FORM if group == 'site_domain' else
            CAMPAIGN_JSON_FORM if group == 'campaign' else
            ADVERTISER_JSON_FORM if group == 'advertiser' else
            ADVERTISER_DOMAIN_JSON_FORM if group == 'advertiser,domain' else
            ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM)
    form = form % ( (start_date, end_date) )
    return form

class ReportDomain(ReportingHandler):

    @tornado.web.authenticated
    @decorators.formattable
    def get(self):
        url = self.request.uri
        kwargs = parse_params(url)

        if 'format' in kwargs:
            kwargs.pop('format')

        kwargs = dict((k, int(v) if v.isdigit() else urllib.unquote(v))
                      for k, v in kwargs.items())
        logging.info("kwargs: %s" % kwargs)

        data = get_report(**kwargs)

        def default(self, data):
            self.render("reporting_domain/_report_domain.html", data=data)

        yield default, (data,)


def main():
    define('group',
            help="choices: advertiser | campaign | advertise,site_domain | advertise,site_domain,campaign",
            type=str,
            default='site_domain',
            )
    define('act',
            type=bool,
            default=False)
    define('path',
            help='where to put tmp csv file')
    define('campaign',
            help='specify campaign')
    define('advertiser',
            help='specify advertiser')
    define('limit',
            help='lines of result',
            type=int,
            default=LIMIT,
            )
    define('threshold',
            help='threshold of media cost',
            type=int,
            default=THRESHOLD,
            )
    define('days',
            help='how many days between the start date',
            type=int,
            default=1,
            )
    define('end',
            help='end date, examples: 2014-07-15',
            )
    define("runserver", type=bool, default=False)
    define("port", default=8081, help="run on the given port", type=int)
    define("cache", type=bool, default=False, help="use cached csv file or api data")
    define("metrics", type=str, default=WORST)

    parse_command_line()
    group = options.group
    act = options.act
    days = options.days
    end_date = options.end
    path = options.path

    if options.runserver:
        app = tornado.web.Application([
            (r'/reportdomain/*', ReportDomain, dict(db="",api="",hive="")),
        ],debug=True)

        server = tornado.httpserver.HTTPServer(app)
        server.listen(options.port)
        tornado.ioloop.IOLoop.instance().start()
    else:
        result = get_report(group=group,
                campaign=options.campaign,
                advertiser=options.advertiser,
                limit=options.limit,
                threshold=options.threshold,
                path=path,
                act=act,
                cache=options.cache,
                end_date=end_date,
                days=days,
                metrics=options.metrics,
                )
        pprint(result)

if __name__ == '__main__':
    exit(main())
