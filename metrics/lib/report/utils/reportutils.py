import os
import re
import sys
import glob
import inspect
import logging

from link import lnk

FILE_FMT = '{name}_{group}{start_date}_{end_date}.csv'
TMP_DIR = os.path.abspath('/tmp')

def get_path(
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

CONSOLE = None
def get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    console = lnk.api.console
    logging.info("created a api console")
    CONSOLE = console
    return console

def get_advertisers():
    cur = lnk.dbs.mysql
    df = cur.select('select external_advertiser_id, advertiser_name from advertiser;').as_dataframe()
    return df

def get_advertiser_ids():
    df = get_advertisers()
    return list(df['external_advertiser_id'].values)

def get_db(name='test'):
    str_ = 'lnk.dbs.{name}'.format(name=name)
    logging.info("selecting database: %s" % name)
    db = eval(str_)
    return db

def get_report_obj(report_name, db=None):
    name = filter(str.isalnum, str(report_name).lower())
    if not os.path.dirname(__file__) in sys.path:
        sys.path.append(os.path.dirname(__file__))
    os.chdir(os.path.dirname(__file__) or '.')
    for f in glob.glob("*.py"):
        f = os.path.splitext(f)[0]
        if name == f:
            _module = __import__(f)
            for member_name, obj in inspect.getmembers(_module):
                name = ('report' + report_name).lower()
                if inspect.isclass(obj) and member_name.lower() == name:
                    return obj(db)
    raise ValueError("Can't for related report file")

def convert_timestr(s):
    """
    pre process the date string format to be able to pass to mysql commands
    >>> convert_timestr('2014-07-14')
    '"2014-07-14"'
    """
    def _should_transform(s):
        if not isinstance(s, str):
            return False
        regx = re.compile(r'(\d{4}-\d{2}-\d{2})')
        return ((isinstance(s, str) and (not s in ['NULL', 'False'])) or regx.search(s))
    return '"%s"' % s if _should_transform(s) else s
