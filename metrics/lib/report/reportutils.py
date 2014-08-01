import os
import re
import sys
import glob
import inspect
import logging

from link import lnk

CONSOLE = None
def get_or_create_console():
    global CONSOLE
    if CONSOLE:
        return CONSOLE
    console = lnk.api.console
    logging.info("created a api console")
    CONSOLE = console
    return console

def get_advertiser_ids():
    cur = lnk.dbs.mysql
    df = cur.select('select external_advertiser_id from advertiser;').as_dataframe()
    return map(str, list(df['external_advertiser_id'].values))

def get_db(name='test'):
    str_ = 'lnk.dbs.{name}'.format(name=name)
    logging.info("selecting database: %s" % name)
    db = eval(str_)
    return db

def get_analyze_func(name):
    assert name.isalnum()
    import_str = "from lib.report.analyze.report import analyze_%s as analyze_func" % name
    exec(import_str)
    return analyze_func

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
