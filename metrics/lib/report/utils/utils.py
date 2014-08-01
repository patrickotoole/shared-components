import functools
import time
import logging
import random
from datetime import datetime
from datetime import timedelta
import pytz
import urlparse
from functools import update_wrapper
from lib.report.utils.constants import APPNEXUS_REPORT_GAP_HOURS

DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'
DATE_TIME_FORMAT2 = '%Y-%m-%d %H:%M'
DATE_FORMAT = '%Y-%m-%d'
TIME_FMTS = [
    DATE_TIME_FORMAT,
    DATE_FORMAT,
    ]

def decorator(d):
    "Make function d a decorator: d wraps a function fn."
    def _d(fn):
        return update_wrapper(d(fn), fn)
    update_wrapper(_d, d)
    return _d

@decorator
def memo(f):
    cache = {}
    def _f(*args):
        try:
            return cache[args]
        except KeyError:
            cache[args] = result = f(*args)
            return result
        except TypeError:
            return f(args)
    return _f

class retry(object):
    """
    Converts with_retry into a decorator.

    @see with_retry for args
    """
    def __init__(self, *args, **kwargs):
        self._args = args
        self._kwargs = kwargs

    def __call__(self, fn):
        @functools.wraps(fn)
        def wrapped_f(*args, **kwargs):
            self._kwargs['retry_stats'] = kwargs.get('retry_stats')
            self._kwargs['retry_log_prefix'] = kwargs.get('retry_log_prefix')
            return with_retry(lambda: fn(*args, **kwargs),
                    *self._args,
                    **self._kwargs)
        return wrapped_f


def with_retry(func, num_retries=1, validator=None,
               exceptions=[],
               sleep_interval=None,
               retry_stats={},
               retry_log_prefix=None,
               default=None,
        ):
    """

    Execute the function with given number of retries, until the response
    satisfies the condition the validator is checking for.

    @param func: lambda:
    @param num_retries: int, the number of additionl times the func call
    will be attempted. No retries are attempted if this number is 0.
    @param validator: lambda x: bool
    @param exceptions: list(Exception), if specified, only catch exceptions
    of given types.
    @param sleep_interval: int|None, in seconds
    @param retry_stats: dict, modified, to keep track of the retry stats
    @param retry_log_prefix: str|None, prefix
    @param default: Object|None, value to return if we run out of retries
    @return: object
    """
    validator = validator or (lambda x: True)
    trial = 0
    retry_stats = retry_stats or {}
    while trial <= num_retries:
        trial += 1
        try:
            val = func()
            if validator(val):
                return val
            raise ValueError('validation failed')
        except Exception, exception:
            exception_name = exception.__class__.__name__
            if exception_name not in retry_stats:
                retry_stats[exception_name] = 0
            retry_stats[exception_name] += 1

            if exceptions:
                if not any(map(lambda klass: isinstance(exception, klass), exceptions)):
                    raise

            # If ran out of retries, raise exception
            if trial > num_retries:
                if default != None:
                    return default
                raise
            if sleep_interval:
                interval = random.uniform(0.5, 1.5) * sleep_interval * (trial)
                msg = "sleeping %s seconds before retry (%s/%s)" % (interval, trial, num_retries)
                if retry_log_prefix:
                    msg = "%s %s" % (retry_log_prefix, msg)
                logging.info(msg)
                if 'sleep_interval' not in retry_stats:
                    retry_stats['sleep_interval'] = 0
                retry_stats['sleep_interval'] += interval
                time.sleep(interval)
            pass
    return None

def convert_datetime(date_str):
    for f in TIME_FMTS:
        try:
            val = datetime.strptime(date_str, f)
            return val
        except Exception:
            pass
    raise ValueError("wrong time format")

def local_now():
    utc = pytz.timezone('UTC')
    now = utc.localize(datetime.utcnow())
    ny = pytz.timezone('America/New_York')
    return now.astimezone(ny)

def datetime_to_str(dt):
    return dt.strftime(DATE_TIME_FORMAT)

def get_dates(end_date=None, lookback=None):
    _timedelta = timedelta(hours=lookback)
    dates =  get_start_and_end_date(end_date,  _timedelta=_timedelta)
    return dates.get('start_date'), dates.get('end_date')

def get_start_and_end_date(end_date=None, _timedelta=None):
    if not end_date:
        end_date = local_now() - timedelta(hours=APPNEXUS_REPORT_GAP_HOURS)
    if isinstance(end_date, str):
        end_date = convert_datetime(end_date)
    start_date = end_date - _timedelta
    return dict(start_date=datetime_to_str(start_date),
                end_date=datetime_to_str(end_date))

def parse_params(url):
    """
    Given a url, return params as dict

    @param url: str
    @return dict(str,str)
    """
    if not url:
        return {}
    url_parts = list(urlparse.urlparse(url))

    def _get_key_val(segment):
        key_val = segment.split('=')
        if len(key_val) == 1:
            return (key_val[0], '')
        return key_val

    params = (dict([_get_key_val(part) for part in url_parts[4].split('&')]) if
             url_parts[4] else {})
    return params
