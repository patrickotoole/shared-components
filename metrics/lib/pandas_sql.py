import logging
import pandas.io.sql as s
from pandas.io.sql import *
#from pandas.io.sql import _write_sqlite

def get_sqltype(pytype, flavor):
    sqltype = {'mysql': 'VARCHAR (63)',
               'sqlite': 'TEXT'}

    if issubclass(pytype, np.floating):
        sqltype['mysql'] = 'FLOAT'
        sqltype['sqlite'] = 'REAL'

    if issubclass(pytype, np.integer):
        #TODO: Refine integer size.
        sqltype['mysql'] = 'BIGINT'
        sqltype['sqlite'] = 'INTEGER'

    if issubclass(pytype, np.datetime64) or pytype is datetime:
        # Caution: np.datetime64 is also a subclass of np.number.
        sqltype['mysql'] = 'DATETIME'
        sqltype['sqlite'] = 'TIMESTAMP'

    if pytype is datetime.date:
        sqltype['mysql'] = 'DATE'
        sqltype['sqlite'] = 'TIMESTAMP'

    if issubclass(pytype, np.bool_):
        sqltype['sqlite'] = 'INTEGER'
        sqltype['mysql'] = 'TINYINT'

    return sqltype[flavor]

def _write_mysql(frame, table, names, con, key=None):
    """
    @param: frame (df):
    @param: table (string):
    @param: names (list(sql_column_names)):
    @param: con Link(db_wrapper):
    @param: key (list(unique_column_names)):
    @param: fn (function to transform the strings)
    """
    if len(frame) == 0:
        return
    key = key or []
    bracketed_names = ['`' + column + '`' for column in names]
    col_names = ','.join(bracketed_names)
    wildcards = '(' + ','.join([r"%s"] * len(names)) + ')'
    updates = ','.join(['%s.`%s` = VALUES(%s.`%s`)' % ( table,con.escape_string(c),table,con.escape_string(c) )
                        for c in names if not c in key])

    _db = con.cursor()._get_db()
    values = ','.join([wildcards % tuple([_db.literal(_v) for _v in v])
                       for v in frame.values])
    insert_query = "INSERT INTO %s (%s) VALUES %s ON DUPLICATE KEY UPDATE %s" % (table, col_names, values, updates)

    try:
        con.cursor().execute(insert_query)
    except Exception as e:
        logging.exception("%s, query: %s" % (e, insert_query))
        raise

    return insert_query

def write_frame(frame, name, con, flavor='sqlite', if_exists='fail', **kwargs):
    """
    Write records stored in a DataFrame to a SQL database.

    Parameters
    ----------
    frame: DataFrame
    name: name of SQL table
    con: an open SQL database connection object
    flavor: {'sqlite', 'mysql', 'oracle'}, default 'sqlite'
    if_exists: {'fail', 'replace', 'append'}, default 'fail'
        fail: If table exists, do nothing.
        replace: If table exists, drop it, recreate it, and insert data.
        append: If table exists, insert data. Create if does not exist.
    """

    if 'append' in kwargs:
        import warnings
        warnings.warn("append is deprecated, use if_exists instead",
                      FutureWarning)
        if kwargs['append']:
            if_exists='append'
        else:
            if_exists='fail'

    if if_exists == 'update':
        key = kwargs.get('key',None)
    else:
      key = None

    exists = table_exists(name, con, flavor)
    if if_exists == 'fail' and exists:
        raise ValueError, "Table '%s' already exists." % name

    #create or drop-recreate if necessary
    create = None
    if exists and if_exists == 'replace':
        create = "DROP TABLE %s" % name
        cur = con.cursor()
        cur.execute(create)
        cur.close()
        create = get_schema(frame, name, flavor, key)
    elif not exists:
        create = get_schema(frame, name, flavor, key)

    if create is not None:
        cur = con.cursor()
        cur.execute(create)
        cur.close()

    cur = con.cursor()
    # Replace spaces in DataFrame column names with _.
    safe_names = [s.replace(' ', '_').strip() for s in frame.columns]
    flavor_picker = {#'sqlite' : _write_sqlite,
                     'mysql' : _write_mysql}

    func = flavor_picker.get(flavor, None)
    if func is None:
        raise NotImplementedError
    func(frame, name, safe_names, con, key=key)
    cur.close()
    con.commit()

s.get_sqltype = get_sqltype
s.write_frame = write_frame
s._write_mysql = _write_mysql
