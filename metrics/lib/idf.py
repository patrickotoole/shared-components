import pandas as pd
import ast
from collections import Counter
import logging

POP_QUERY = '''
SELECT
    domains,
    num_imps
FROM pop_uid_domains
'''

def to_domain_count(data):
    c = Counter()
    for d in data['domains']:
        c.update(d)
    domain_count =  pd.DataFrame.from_dict(c, orient='index').reset_index()
    domain_count.columns = ['domain','count']
    return domain_count

def extract(hive):
    df = hive.select_dataframe(POP_QUERY)
    return df

def transform(df):

    assert "domains" in df.columns
    assert len(df) > 0

    df['domains'] = df['domains'].apply(ast.literal_eval)
    transformed = to_domain_count(df)
    transformed['total_users'] = len(df)
    transformed['pct_users'] = transformed['count']/ float(len(df))
    transformed['idf'] = 1./ transformed['pct_users']

    cols = transformed.columns

    assert len(transformed) > 0
    assert "domain" in cols
    assert "count" in cols
    assert "total_users" in cols
    assert "pct_users" in cols
    assert "idf" in cols


    return transformed

def write_to_sql(db,df):
    from appnexus_reporting.load import DataLoader

    loader = DataLoader(db)
    key = "domain"
    columns = df.columns
    loader.insert_df(df,"domain_idf",["domain"],columns)

def run(hive,db):
    
    df = extract(hive)
    logging.info("data extracted with %d rows" %len(df))

    if len(df) == 0:
        logging.info("no data")
        return

    df = transform(df)
    logging.info("aggregated to %d domains" %len(df))

    logging.info("writing to sql")
    write_to_sql(db,df)

if __name__ == "__main__":

    from link import lnk
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)

    parse_command_line()
    basicConfig(options=options)


    hive = lnk.dbs.hive
    crushercache = lnk.dbs.crushercache

    run(hive,crushercache)
