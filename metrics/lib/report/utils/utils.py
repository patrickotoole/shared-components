import re
import logging
import random
import urlparse
import functools
from functools import update_wrapper

import time
import pytz
import calendar
from datetime import datetime
from datetime import timedelta
from datetime import tzinfo

#------------------------timeutils---------------------------

DATE_TIME_FORMAT = '%Y-%m-%d %H:%M:%S'

DATE_FORMAT = '%Y-%m-%d'

DATETIME_FORMATS = [
    DATE_TIME_FORMAT,
    DATE_FORMAT,
    ]

FLOAT_PATTERN = r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?'

TIMEDELTA_PATTERN = re.compile(
    r'\s*(%s)\s*(\w*)\s*' % FLOAT_PATTERN, re.IGNORECASE)

TIMEDELTA_ABBREVS = [
    ('hours', ['h']),
    ('minutes', ['m', 'min']),
    ('seconds', ['s', 'sec']),
    ('milliseconds', ['ms']),
    ('microseconds', ['us']),
    ('days', ['d']),
    ('weeks', ['w']),
    ('months', ['M']),
]

TIMEDELTA_ABBREV_DICT = dict(
        (abbrev, full) for full, abbrevs in TIMEDELTA_ABBREVS
        for abbrev in abbrevs)

class FixedOffsetTZ(tzinfo):
    """
    Defines a timezone with an arbitrary minute offset of
    UTC. Generally, minute offset should be negative, signifying west
    of UTC.

    See: http://docs.python.org/library/datetime.html#tzinfo-objects
    """

    def __init__(self, minute_offset):
        """
        @param minute_offset: int, number of minutes offset east of
                              UTC (negative for west)
        """

        if minute_offset >= 1440 or minute_offset <= -1440:
            raise ValueError("minute offset must be in [-1439, 1439]")

        self._zero = timedelta(0)
        self._utcoffset = timedelta(minutes=minute_offset)

    def dst(self, *args, **kwargs):
        return self._zero

    def tzname(self, dt):
        return str(self._minute_offset)

    def utcoffset(self, dt):
        return self._utcoffset

    def localize(self, dt):
        return dt.replace(tzinfo=self)

    def normalize(self, dt):
        return dt.astimezone(self)

def convert_tzinfo(tz):
    """
    Produces a tzinfo instance given a tz string. Raises ValueError if
    we can't figure out a timezone from tz.

    @param tz: int|str, integer fixed minute offset, otherwise Olson timezone
    @return tzinfo
    """

    try:
        return FixedOffsetTZ(int(tz))
    except ValueError:
        pass

    try:
        return pytz.timezone(tz)
    except pytz.exceptions.UnknownTimeZoneError:
        pass

    raise ValueError("unknown timezone '%s'" % tz)

def localize(dt, normalize=False, tz='America/New_York'):
    """
    @param normalize: bool. If not normalize, just changes the timezone
    information. This changes the associated time, so use it carefully. For
    proper localization set normalize to TRUE
    """
    tzinfo = pytz.timezone(tz)
    if normalize:
        return tzinfo.normalize(dt)
    return dt.replace(tzinfo=tzinfo)

def local_now():
    utc = pytz.timezone('UTC')
    now = utc.localize(datetime.utcnow())
    ny = pytz.timezone('America/New_York')
    return now.astimezone(ny)

def get_week_begin(dt):
    """
    Return the beginning of the week, where a week begins on Monday

    @param dt: date
    @param dt: date
    """
    return dt - timedelta(days=dt.weekday())

def datetime_to_str(dt, fmt=None):
    fmt = fmt or DATE_TIME_FORMAT
    return dt.strftime(fmt)

def align_to_day(timestr):
    """
    @param timestr : str
    @return        : str
    """
    ts = parse(timestr)
    return datetime_to_str(ts, DATE_FORMAT)

def elapsed_seconds(delta):
    """Convert a timedelta to total elapsed seconds (as a float).
    """
    return (24*60*60) * delta.days + delta.seconds + float(delta.microseconds) / 10**6

def datetime_to_unixtime(dt):
    """Convert a datetime object to an int of the number of seconds elapsed
    since the epoc."""
    return calendar.timegm(dt.utctimetuple())

def days_in_prev_month(ts):
    return calendar.monthrange(ts.year, ts.month-1)[1]

def parse(time_str, tz='America/New_York', now=None):
    """
    Convert a string that could be either number of seconds since
    epoch (unixtime) or a formatted string to a datetime.

    @param time_str: str|datetime|None
    @param now: datetime|None, uses current time by default
    @return datetime
    """
    if not time_str or isinstance(time_str, datetime):
        return time_str

    dt = _as_datetime(time_str) or _as_timedelta(time_str, now)

    if dt is None:
        raise ValueError("unable to convert '%s' to datetime" % time_str)

    if tz:
        try:
            tzinfo = convert_tzinfo(tz)
            if dt.tzinfo:
                localize(dt, tz=tz, normalize=True)
            else:
                dt = tzinfo.localize(dt)
        except pytz.exceptions.UnknownTimeZoneError:
            raise ValueError("unknown timezone '%s'" % tz)

        dt = pytz.timezone('America/New_York').normalize(dt)

    return dt

def _as_datetime(t):
    try:
        return parse_datetime(t)
    except ValueError:
        return None

def _as_timedelta(t, now=None):
    try:
        _timedelta = parse_timedelta(t)
        return (now or local_now()) - _timedelta
    except Exception:
        return None

def parse_timedelta(value):
    try:
        sum = timedelta()
        start = 0
        while start < len(value):
            m = TIMEDELTA_PATTERN.match(value, start)
            if not m:
                raise Exception()
            num = float(m.group(1))
            units = m.group(2) or 'seconds'
            units = TIMEDELTA_ABBREV_DICT.get(units, units)
            if units == 'months':
                _days = days_in_prev_month(datetime.now())
                sum += timedelta(days=int(num)*_days)
            else:
                sum += timedelta(**{units: num})
            start = m.end()
        return sum
    except:
        raise

def parse_datetime(date_str):
    for f in DATETIME_FORMATS:
        try:
            val = datetime.strptime(date_str, f)
            return val
        except Exception:
            pass
    raise ValueError('Unrecognized date/time format: %s' % date_str)

def align(frequency, ts):
    """
    @param frequency: timedelta
    @param ts: datetime
    @return aligned_ts: datetime
    """
    #TOFIX, align to day has timezone issue.
    epoch = datetime(*time.gmtime(0)[:6])
    if ts.tzinfo:
        epoch = ts.tzinfo.localize(epoch)
    delta_sec = elapsed_seconds(ts - epoch)
    offset = delta_sec % elapsed_seconds(frequency)
    return ts - timedelta(seconds=offset)

def get_start_end_date(start_date=None, end_date=None, units='hours'):
    """
    @param start_date|end_date: str('1m'|'1h'|'1d|2014-07-14')
    @return: str('2014-07-14 00:00:00')
    """
    _td = timedelta(**{units: 1})
    def _f(t):
        return align(_td, parse(t))
    def _is_delta(t):
        return TIMEDELTA_PATTERN.search(t)

    if _is_delta(end_date):
        if units == 'days':
            return align_to_day(start_date), align_to_day(end_date)
        end_date = _f(end_date)
        start_date = _f(start_date)
        return datetime_to_str(start_date), datetime_to_str(end_date)
    else:
        return start_date, end_date

#---------timeutils ended----------------------------------


#---------urlutils-----------------------------------

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

#---------urlutils ended-----------------------------------


#-----------------------------------
# decorators utils

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
