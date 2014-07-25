import logging
import os
import io
import urllib

import pandas as pd
from link import lnk

from lib.report.utils.utils import retry
from lib.report.utils.utils import get_start_and_end_date
from lib.report.utils.utils import parse_params
from lib.report.utils.constants import *
from handlers.reporting import ReportingHandler
from lib.helpers import decorators

from request_json_forms import DOMAIN_JSON_FORM
from request_json_forms import ADVERTISER_DOMAIN_JSON_FORM
from request_json_forms import ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM
from request_json_forms import DATA_PULLING_FORMS
from request_json_forms import CONVERSIONS_FORM


CUR_DIR = os.path.dirname(__file__)

def _create_csv(text, path):
    with open(path, 'w') as f:
        f.write(text)
    return path

def _resp_to_df(resp):
    df = pd.read_csv(io.StringIO(unicode(resp)))
    return df

def _get_path(name, advertiser_id):
    path = ('csv_file/{name}{advertiser_id}.csv'.format(
            name=name,
            advertiser_id=advertiser_id,
            )).lower()
    return os.path.join(CUR_DIR, path)

def get_resp(group=None,
        start_date=None,
        end_date=None,
        advertiser_id=None,
        pixel_id=None,
        ):
    logging.info("getting data from date: %s -- %s." % (start_date, end_date))
    request_form = _get_forms(group=group,
            start_date=start_date,
            end_date=end_date,
            pixel_id=pixel_id,
            )
    request_url = _get_request_url(group, advertiser_id)
    logging.info("requesting data from url: %s" % request_url)
    _id = _get_report_id(request_url, request_form)
    url = _get_report_url(_id)
    resp = _get_report_resp(url)
    return resp

def _get_request_url(group, advertiser_id=None):
    if advertiser_id:
        return '/report?advertiser_id=' + advertiser_id
    return '/report?'

@retry(num_retries=NUM_TRIES,
       sleep_interval=SLEEP,
       retry_log_prefix='no report id detected, reconnecting',
       )
def _get_report_id(request_url, request_json_form):
    resp = _get_resp(request_url, method='post', forms=request_json_form)
    json_ = resp.json
    error = json_.get('response').get('error')
    if error:
        logging.warn(error)
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

def _get_forms(group=None,
        start_date=None,
        end_date=None,
        pixel_id=None,
        ):
    form = (DOMAIN_JSON_FORM if group == 'site_domain' else
            ADVERTISER_DOMAIN_JSON_FORM if group == 'advertiser,domain' else
            ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM if group == 'advertiser,domain,campaign' else
            DATA_PULLING_FORMS if group == 'datapulling' else
            CONVERSIONS_FORM)
    if pixel_id:
        form = form % ( (start_date, end_date, pixel_id, pixel_id) )
    else:
        form = form % ( (start_date, end_date) )
    return form

def _get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    console = lnk.api.console
    logging.info("created a api console")
    CONSOLE = console
    return console

class ReportBase(object):
    def __init__(self, name):
        self.name = name

    def get_report(self,
            group=None,
            limit=LIMIT,
            path=None,
            act=False,
            end_date=None,
            cache=False,
            lookback=1,
            pred=None,
            metrics=WORST,
            ):
        df = []
        start_date, end_date = self._get_start_and_end(end_date, lookback)
        advertiser_ids = self._get_advertiser_ids() or ['']
        for advertiser_id in advertiser_ids:
            pixel_ids = self._get_pixel_ids() or ['']
            for pixel_id in pixel_ids:
                result = self._get_report_helper(
                        group=group,
                        path=path,
                        act=act,
                        cache=cache,
                        start_date=start_date,
                        end_date=end_date,
                        advertiser_id=advertiser_id,
                        pixel_id=pixel_id,
                        )
                df.append(result)
                if limit and len(dfs) >= limit:
                    break
        df = pd.concat(df)
        df = self._filter(df, pred=pred, metrics=metrics)
        return df[:limit]

    def _get_report_helper(self,
            group=None,
            path=None,
            act=False,
            start_date=None,
            end_date=None,
            cache=False,
            advertiser_id=None,
            pixel_id=None,
            ):
        df = None
        _should_create_csv = False
        if cache:
            path = _get_path(group, advertiser_id)

        if path:
            logging.info("Getting csv file from: %s" % path)
            try:
                df = pd.read_csv(path)
            except IOError:
                logging.warn("csv file don't exist: %s" % path)
                _should_create_csv = True

        if df is None:
            resp = get_resp(group=group,
                    end_date=end_date,
                    start_date=start_date,
                    advertiser_id=advertiser_id,
                    pixel_id=pixel_id,
                    )
            df = _resp_to_df(resp)
            if _should_create_csv and act:
                logging.info("creating csv file: %s" % path)
                _create_csv(resp, path)

        return df

    def _get_start_and_end(self, end_date, lookback):
        _timedelta = self._get_timedelta(lookback)
        return get_start_and_end_date(end_date,  _timedelta=_timedelta)

    def _filter(self, df, *args, **kwargs):
        raise NotImplementedError

    def _get_timedelta(self, lookback):
        raise NotImplementedError

    def _get_advertiser_ids(self):
        return None

    def _get_pixel_ids(self):
        return None

class ReportDomainHandler(ReportingHandler):
    def __init__(self, name, *args, **kwargs):
        self._name = name
        super(ReportDomainHandler, self).__init__(*args, **kwargs)

    #@tornado.web.authenticated
    @decorators.formattable
    def get(self):
        url = self.request.uri
        kwargs = parse_params(url)

        if 'format' in kwargs:
            kwargs.pop('format')

        kwargs = dict((k, int(v) if v.isdigit() else urllib.unquote(v))
                      for k, v in kwargs.items())
        logging.info("kwargs: %s" % kwargs)

        data = self.get_report(**kwargs)

        def default(self, data):
            url = "reporting_domain/_report_%s.html" % self._name
            self.render(url, data=data)

        yield default, (data,)

    def _get_report(self, *args, **kwargs):
        raise NotImplementedError
