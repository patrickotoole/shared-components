import logging
import os
import io
import urllib

import pandas as pd

from lib.report.utils.utils import retry
from lib.report.utils.utils import parse_params
from lib.report.reportutils import get_report_obj
from lib.report.reportutils import get_or_create_console
from lib.report.analyze.report import filter_pred

from lib.report.utils.constants import NUM_TRIES
from lib.report.utils.constants import SLEEP
from lib.report.utils.constants import WORST
from lib.report.utils.utils import get_dates

from handlers.reporting import ReportingHandler
from lib.helpers import decorators

CUR_DIR = os.path.dirname(__file__)
TMP_DIR = os.path.abspath('/tmp')
FILE_FMT = '{name}_{group}{start_date}_{end_date}.csv'

def _create_csv(df, path):
    logging.info("creating csv file to path: %s" % path)
    df.to_csv(path, index=False)

def _resp_to_df(resp):
    df = pd.read_csv(io.StringIO(unicode(resp)))
    return df

def _get_path(
        name=None,
        group=None,
        start_date=None,
        end_date=None,
        ):
    _len = len("yyyy-mm-dd-hh")
    def _helper(ts):
        ts = (ts[:_len]).replace(' ', '-')
        return ts
    start_date, end_date = _helper(start_date), _helper(end_date)
    file_name = FILE_FMT.format(name=name,
            group=group or "",
            start_date=start_date,
            end_date=end_date,
            ).lower()
    path = os.path.join(TMP_DIR, file_name)
    return path

def _get_request_url(advertiser_id=None):
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
       )
def _get_report_url(report_id):
    url = '/report?id={report_id}'.format(report_id=report_id)
    resp = _get_resp(url)
    _resp = resp.json.get('response')
    url = _resp.get('report').get('url')
    if not url:
        status = _resp.get('execution_status')
        logging.warn("report: %s status is %s" % (report_id, status))
        raise ValueError(status)
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
    c = get_or_create_console()
    if method == 'get':
        resp = c.get(url)
    else:
        resp = c.post(url, forms)
    return resp

def _is_empty(df):
    return len(df) == 0

class LimitError(ValueError):
    pass

class ReportBase(object):
    def __init__(self, db, *args, **kwargs):
        self._db_wrapper = db

    def get_report(self,
            group=None,
            limit=None,
            path=None,
            end_date=None,
            cache=False,
            lookback=1,
            pred=None,
            metrics=WORST,
            ):
        dfs = []
        start_date, end_date = get_dates(end_date=end_date, lookback=lookback)
        logging.info("Getting start date: %s, end date: %s" % (start_date, end_date))
        _should_create_csv = False
        if cache:
            path = _get_path(
                    name=self._name,
                    group=group,
                    start_date=start_date,
                    end_date=end_date,
                    )
        if path:
            try:
                logging.info("Getting csv from path: %s" % path)
                dfs = [pd.read_csv(path)]
            except IOError:
                logging.warn("CSV file not exists in path: %s" % path)
                _should_create_csv = True

        if not dfs:
            dfs = self._get_dataframes(group=group,
                    end_date=end_date,
                    start_date=start_date,
                    limit=limit,
                    )
        dfs = pd.concat(dfs)
        if _is_empty(dfs):
            return dfs
        if _should_create_csv:
            _create_csv(dfs, path)

        dfs = self._analyze(dfs, pred=pred, metrics=metrics)
        return dfs[:limit]

    def _get_dataframes(self, **kwargs):
        dfs = []
        limit = kwargs['limit']
        advertiser_ids = self._get_advertiser_ids() or ['']
        for advertiser_id in advertiser_ids:
            pixel_ids = self._get_pixel_ids(advertiser_id) or ['']
            for pixel_id in pixel_ids:
                resp = self._get_resp_helper(
                        group=kwargs['group'],
                        end_date=kwargs['end_date'],
                        start_date=kwargs['start_date'],
                        advertiser_id=advertiser_id,
                        pixel_id=pixel_id,
                        )
                df = _resp_to_df(resp)
                dfs.append(df)
                if limit and len(dfs) >= limit:
                    return dfs
        return dfs

    def _get_resp_helper(self,
            group=None,
            start_date=None,
            end_date=None,
            advertiser_id=None,
            pixel_id=None,
            ):
        logging.info("getting data from date: %s -- %s." % (start_date, end_date))
        request_form = self._get_form(
                group=group,
                start_date=start_date,
                end_date=end_date,
                pixel_id=pixel_id,
                )
        request_url = _get_request_url(advertiser_id)
        logging.info("requesting data from url: %s" % request_url)
        _id = _get_report_id(request_url, request_form)
        url = _get_report_url(_id)
        resp = _get_report_resp(url)
        return resp

    def _get_form(self,
            group=None,
            start_date=None,
            end_date=None,
            pixel_id=None,
            ):
        _d = dict(start_date=start_date, end_date=end_date)
        if pixel_id:
            _d.update(dict(pixel_id=pixel_id))
        _form = self._get_form_helper(group)
        return _form % _d

    def _get_form_helper(self, *args, **kwargs):
        raise NotImplementedError

    def _analyze(self, df, *args, **kwargs):
        df = filter_pred(df, pred=kwargs.get('pred'))
        df = self._analyze_helper(df, *args, **kwargs)
        return df

    def _analyze_helper(self, df, *args, **kwargs):
        raise NotImplementedError

    def _get_advertiser_ids(self):
        return None

    def _get_pixel_ids(self, advertiser_id):
        return None

    def _get_unique_table_key(self):
        return None

class ReportDomainHandler(ReportingHandler):
    def initialize(self, *args, **kwargs):
        pass

    #@tornado.web.authenticated
    @decorators.formattable
    def get(self, name):
        url = self.request.uri
        kwargs = parse_params(url)

        if 'format' in kwargs:
            kwargs.pop('format')

        kwargs = dict((k, int(v) if v.isdigit() else urllib.unquote(v))
                      for k, v in kwargs.items())
        logging.info("kwargs: %s" % kwargs)

        report_obj = get_report_obj(name)
        data = report_obj.get_report(**kwargs)

        def default(self, data):
            url = "reporting_domain/_report_%s.html" % name
            self.render(url, data=data)

        yield default, (data,)
