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

def _get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    console = lnk.api.console
    logging.info("created a api console")
    CONSOLE = console
    return console

def _is_empty(df):
    return len(df) == 0

class LimitError(ValueError):
    pass

class ReportBase(object):
    def __init__(self, name):
        self._name = name

    def get_report(self,
            group=None,
            limit=None,
            path=None,
            act=False,
            end_date=None,
            cache=False,
            lookback=1,
            pred=None,
            metrics=WORST,
            ):
        dfs = []
        start_date, end_date = self._get_dates(end_date=end_date, lookback=lookback)
        logging.info("Getting start date: %s, end date: %s" % (start_date, end_date))
        advertiser_ids = self._get_advertiser_ids() or ['']
        for advertiser_id in advertiser_ids:
            try:
                pixel_ids = self._get_pixel_ids(advertiser_id) or ['']
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
                    dfs.append(result)
                    if limit and len(dfs) >= limit:
                        raise(LimitError)
            #hacky to break out of 2 loop
            except LimitError:
                break
        dfs = pd.concat(dfs)
        if _is_empty(dfs):
            return dfs
        dfs = self._filter(dfs, pred=pred, metrics=metrics)
        return dfs[:limit]

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
            resp = self._get_resp_helper(
                    group=group,
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
        request_url = _get_request_url(group, advertiser_id)
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

    def _get_dates(self, end_date=None, lookback=None):
        _timedelta = self._get_timedelta(lookback)
        dates =  get_start_and_end_date(end_date,  _timedelta=_timedelta)
        return dates.get('start_date'), dates.get('end_date')

    def _filter(self, df, *args, **kwargs):
        raise NotImplementedError

    def _get_timedelta(self, lookback):
        raise NotImplementedError

    def _get_advertiser_ids(self):
        return None

    def _get_pixel_ids(self, advertiser_id):
        return None

    def _work(self, df, table_name):
        """
        write df to sql
        assuming all the df's field is exactly the fields in the table

        @params:
        ________
        df         : Pandas Dataframe
            df to write to sql
        table_name : string
            database tablename to write to
        """
        my_db = lnk.dbs.roclocal
        #con = MySQLdb.connect(host="localhost", db='roclocal', user='root')
        logging.info("creating %s" % table_name)
        df.to_sql(table_name, my_db, flavor='mysql',  if_exists='append', index=False)

class ReportDomainHandler(ReportingHandler):
    def initialize(self, name, report_obj, **kwargs):
        self._name = name
        self._report_obj = report_obj

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

        data = self._report_obj.get_report(**kwargs)

        def default(self, data):
            url = "reporting_domain/_report_%s.html" % self._name
            self.render(url, data=data)

        yield default, (data,)
