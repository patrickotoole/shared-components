import os
import re
import sys
import glob
import inspect
import logging

from link import lnk
import pandas as pd

FILE_FMT = '{name}_{group}{start_date}_{end_date}.csv'
TMP_DIR = os.path.abspath('/tmp')
CUR = os.path.dirname(__file__)
REPORT_DIR = os.path.abspath(os.path.join(CUR, '../reports'))

def get_report_obj(report_name, db=None, path=REPORT_DIR):
    name = filter(str.isalnum, str(report_name).lower())
    if not path in sys.path:
        sys.path.append(path)
    os.chdir(path)
    for f in glob.glob("*.py"):
        f = os.path.splitext(f)[0]
        if name == f:
            _module = __import__(f)
            found = get_member_name(report_name, _module, db)
            if found:
                return found
    raise ValueError("Can't for related report file")

def get_member_name(report_name, _module, db):
    for member_name, obj in inspect.getmembers(_module):
        name = ('report' + report_name).lower()
        if inspect.isclass(obj) and member_name.lower() == name:
            return obj(db)
    return None

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

def get_advertisers():
    cur = lnk.dbs.mysql
    df = cur.select('select external_advertiser_id, advertiser_name from advertiser;').as_dataframe()
    return df

def get_advertiser_ids():
    df = get_advertisers()
    return list(df['external_advertiser_id'].values)

def get_db(name='test'):
    str_ = 'lnk.dbs.{name}'.format(name=name)
    try:
        db = eval(str_)
        return db
    except KeyError:
        logging.info("Database %s not found" % name)
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

def empty_frame():
    return pd.DataFrame()

def concat(dfs):
    """
    @param dfs: list(DataFrame)
    @return: DataFrame
    """
    dfs = pd.concat(dfs)
    return dfs

def corret_insert(db, df, table_name):
    """
    check if all the dataframe is correctly inserted in db
    @param db         : Lnk.dbs
    @param df         : DataFrame
    @param table_name : Lnk.dbs
    @return           : bool
    """
    cols = list(df.columns)
    db_df = db.select_dataframe("select * from %s" % table_name)

    df = df.set_index(cols)
    db_df = db_df[cols].set_index(cols)

    try:
        [db_df.ix[idx] for idx in df.index]
        return True
    except KeyError:
        return False
