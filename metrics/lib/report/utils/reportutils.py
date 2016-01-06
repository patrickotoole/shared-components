import os
import re
import sys
import glob
import inspect
import logging

import pandas as pd
from link import lnk

from lib.report.utils.utils import memo
from lib.report.utils.constants import DEFAULT_DB
from lib.report.utils.apiutils import get_or_create_console
from lib.pandas_sql import s as _sql

FILE_FMT = '{name}_{group}{start_date}_{end_date}.csv'
TMP_DIR = os.path.abspath('/tmp')
CUR = os.path.dirname(__file__)
REPORT_DIR = os.path.abspath(os.path.join(CUR, '../reports'))
SELECT_UNIQUE_KEY_QUERY = """SELECT k.COLUMN_NAME FROM information_schema.table_constraints t LEFT JOIN information_schema.key_column_usage k USING(constraint_name,table_schema,table_name) WHERE t.constraint_type='UNIQUE' AND t.table_schema=DATABASE() AND t.table_name='{table_name}'"""

def get_report_obj(report_name, path=REPORT_DIR):
    name = filter(str.isalnum, str(report_name).lower())
    _insert_path_to_front(path)
    os.chdir(path)
    for f in glob.glob("*.py"):
        f = os.path.splitext(f)[0]
        if name == f:
            _module = __import__(f)
            found = get_member_name(name, _module)
            if found:
                return found
    raise ValueError("Can't for related report file")

def _insert_path_to_front(path):
    if path in sys.path:
        sys.path.pop(sys.path.index(path))
    sys.path = [path] + sys.path

def get_member_name(report_name, _module):
    for member_name, obj in inspect.getmembers(_module):
        name = ('report' + report_name).lower()
        if inspect.isclass(obj) and member_name.lower() == name:
            return obj
    return None

def get_path( name=None,
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

def get_advertisers(db=None):
    db = db or get_db('rockerbox')
    df = db.select_dataframe('select external_advertiser_id, advertiser_name from advertiser where deleted=0 and active=1;')
    return df

@memo
def get_advertiser_ids():
    q = 'select * from rockerbox.advertiser where active=1 and deleted=0 and running=1'
    c = get_or_create_console()

    advs = c.get_all_pages('/advertiser', 'advertisers')
    active_on_appnexus = set(a.get('id') for a in advs if a.get('state') == 'active')
    df = DEFAULT_DB().select_dataframe(q);
    active_in_db = set(df.external_advertiser_id)

    return active_in_db & active_on_appnexus


def get_db(name='test'):
    str_ = 'lnk.dbs.{name}'.format(name=name)
    try:
        db = eval(str_)
        return db
    except KeyError:
        logging.warn("Database %s not found" % name)
        raise
    logging.info("selected database: %s" % db.database)

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

def concat(dfs):
    """
    @param dfs: list(DataFrame)
    @return: DataFrame
    """
    dfs = filter(lambda d: not len(d) == 0, dfs)
    if not dfs:
        return pd.DataFrame()
    dfs = pd.concat(dfs)
    return dfs

def get_unique_keys(con, table_name):
    """
    :con: Link(db_wrapper)
    :table_name: str
    :return: list(str)|None
    """
    query = SELECT_UNIQUE_KEY_QUERY.format(table_name=table_name)
    return set(list(con.select_dataframe(query)['column_name']))


def write_mysql(frame, table=None, con=None):
    key = get_unique_keys(con, table)
    length = len(frame)
    batches = max(1,int(length / 50)+1)
    logging.info("Rows to insert: %s" % length)
    logging.info("Batches to insert: %s" % batches)
    for b in range(0,batches):
        logging.info("Inserting batch: %s" % b)
        to_insert = frame.ix[b*50:(b+1)*50+1]
        if len(to_insert) > 0:
            _sql._write_mysql(to_insert, table, list(frame.columns), con, key=key)
