"""
report the least effective campins/advertiser/domain etc.

 Two of the most import element
 -- post_view/click_convs
 -- media_cost

 1. Create the JSON-formatted report request
 2. POST the request to the Reporting Service
 3. Use the Report ID to retrieve the report data
 4. If necessary, use the Lookup Service to map objects IDs to other relevant data, such as names, codes, and statuses
"""

import logging
import os
import re
from datetime import timedelta
import StringIO

from pprint import pprint
import pandas as pd

from link import lnk
from tornado.options import define
from tornado.options import options
from tornado.options import parse_command_line

from utils import retry
from utils import local_now
from utils import convert_datetime

from request_json_forms import DOMAIN_JSON_FORM
from request_json_forms import ADVERTISER_JSON_FORM
from request_json_forms import CAMPAIGN_JSON_FORM
from request_json_forms import ADVERTISER_DOMAIN_JSON_FORM
from request_json_forms import ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM

THRESHOLD = 7 #dollar
NUM_TRIES = 10
LIMIT = 10
SLEEP = 1
NDIGITS = 2  #ndigit to round
NO_CONVS = None
CUR_DIR = os.path.dirname(__file__)

TYPE = 'network_analytics'
CONSOLE = None

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
    path = ('csv_file/%s_temp.csv' % name).lower()
    return os.path.join(CUR_DIR, path)

def _get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    logging.info("created a api console")
    c = lnk.api.console
    CONSOLE = c
    return c

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='retying to connect to api')
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
    df = df[df[MEDIA_COST] > threshold]
    return df

def _sort_df_by_cpa(df):
    """
    given pandas frame, sort them by cpa or media cost if there is no convertions.
    """
    df['convs'] = df[PC_CONVS] + df[PV_CONVS]
    df['cpa'] = df[MEDIA_COST].astype(float) / df['convs'].astype(float)
    df_no_convs = df[df['convs'] == 0]
    df_have_convs = df[df['convs'] != 0]
    df_no_convs = df_no_convs.sort('media_cost', ascending=False)
    df_have_convs = df_have_convs.sort('cpa', ascending=False)
    df = pd.concat([df_no_convs, df_have_convs])
    df = df.reset_index(drop=True)
    return df

def _create_csv(text, path):
    """
    convert text to csv
    """
    with open(path, 'w') as f:
        f.write(text)
    return path

def _create_df_from_resp(text):
    io = StringIO.StringIO()
    io.write(text)
    df = pd.read_csv(io.getvalue())
    return df

def _get_report_id(json_form):
    """
    json_form sample: u'{"report":{"special_pixel_reporting":false,"report_type":"attributed_conversions","timezone":"UTC","report_interval":"yesterday","filters":[{"pixel_id":["203037"]},{"buyer_member_id":"2024"},{"advertiser_id":"250058"},{"imp_type_id":{"operator":"!=","value":6}}],"columns":["pixel_id","pixel_name","line_item_id","line_item_name","campaign_id","campaign_name","creative_id","creative_name","post_click_or_post_view_conv","order_id","user_id","auction_id","external_data","imp_time","datetime"],"row_per":["pixel_id","pixel_name","line_item_id","campaign_id","creative_id","post_click_or_post_view_conv","order_id","user_id"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["pixel_id","pixel_name","line_item_id","line_item_name","campaign_id","campaign_name","creative_id","creative_name","post_click_or_post_view_conv","order_id","user_id","auction_id","external_data","imp_time","datetime"],"ui_columns":["pixel_id","pixel_name","line_item_id","line_item_name","campaign_id","campaign_name","creative_id","creative_name","post_click_or_post_view_conv","order_id","user_id","auction_id","external_data","imp_time","datetime"],"filter_objects":{"pixels":[{"id":203037}]}}}'
    """
    url = '/report?'
    resp = _get_resp(url, method='post', forms=json_form)
    json_ = resp.json
    report_id = json_.get('response').get('report_id')
    logging.info("Got report id: %s" % report_id)
    return report_id

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='no url detected, reconnecting')
def _get_report_url(report_id):
    #have to get the reponse for other function to work
    url = '/report?id={report_id}'.format(report_id=report_id)
    resp = _get_resp(url)
    url = resp.json.get('response').get('report').get('url')
    assert(url)
    logging.info("report url is: %s" % url)
    return url

def _get_report_resp(url):
    """
    Given a url, return csv fmt file?
    """
    logging.info("getting url: %s" % url)
    if not url.startswith('/'):
        url = '/' + url
    resp = _get_resp(url)
    return resp.text

def _to_list(df, group):
    """
    df: pandas
    """
    group = group.split(',')
    headers = group + HEADERS
    dict_ = df.to_dict()
    results = [ dict_.get(h).values()
                for h in headers
              ]
    results = zip(*results)
    return [tuple(headers)] + results

def get_report(form, group,
        campaign=None,
        advertiser=None,
        limit=LIMIT,
        threshold=THRESHOLD,
        path=None,
        act=False,
        ):
    """
    form: json request form
    group: domain | campaign | advertiser
    path: path to csv file, for test.
    """
    logging.info("getting report for group: %s" % group)
    if path:
        df = pd.read_csv(path)
    else:
        _id = _get_report_id(form)
        url = _get_report_url(_id)
        resp = _get_report_resp(url)
        df = _create_df_from_resp(resp)
        if act:
            _create_csv(resp, path)

    if campaign:
        df = _specify_field(df, 'campaign', campaign)
    if advertiser:
        df = _specify_field(df, 'advertiser', advertiser)

    sorted_df = _sort_df_by_cpa(df)
    truncated_df = _truncate(sorted_df, threshold=threshold)
    results = _to_list(truncated_df, group)
    return results[:limit]

def _specify_field(df, field, value):
    """
    select only specified campaign or advertiser
    """
    is_specified = df[field] == value
    return df[is_specified]

def send_email():
    pass

def _get_forms(group,
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
            help='end date, examples: 2014-07-15 00:00:00',
            )


    parse_command_line()
    group = options.group
    act = options.act
    days = options.days
    end_date = options.end

    if not end_date:
        end_date = str(local_now())
    days = options.days
    #FIX ugly range to cut 2014-07-22 18:57:16.278066-04:00 to 2014-07-22 18:57:16
    start_date = str(convert_datetime(end_date[:19]) - timedelta(days=days))

    logging.info("getting data from %s -- %s." % (start_date, end_date))
    form = _get_forms(group,
            start_date=start_date,
            end_date=end_date,
            )
    path = options.path or _get_path(group)
    result = get_report(form, group,
            campaign=options.campaign,
            advertiser=options.advertiser,
            limit=options.limit,
            threshold=options.threshold,
            path=path,
            act=act,
            )

    pprint(result)

    #send_email(result)

if __name__ == '__main__':
    exit(main())
