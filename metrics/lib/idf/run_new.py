import pandas as pd
from collections import Counter
import logging
import pandas
import time

from lib.cassandra_cache.pattern_cache import CacheBase
USERS = 1000000

class Reader(CacheBase):

    def __init__(self,cassandra):
        self.cassandra = cassandra

def chunks(l, n):
    """Yield successive n-sized chunks from l."""
    for i in range(0, len(l), n):
        logging.info(i)
        yield l[i:i+n]    

def to_domain_count(data):
    co = Counter()
    for Q in data['domains']:
        co.update(Q)
    domain_count =  pd.DataFrame.from_dict(co, orient='index').reset_index()
    domain_count.columns = ['domain','count']
    return domain_count


def extract(cassandra, rbidf, categories):
    
    q1 = "select domain, count(*) from pop_data group by domain"
    q2 = "select count(*), HOUR(timestamp) as hour, domain from pop_data group by domain,hour"
    q3 = "select parent_category_name, count(*) from (select b.parent_category_name, a.* from pop_data a join domain_category_only b on a.domain=b.domain) c group by parent_category_name"
    q4 = "select count(*), HOUR(timestamp), parent_category_name as hour from (select a.*,b.parent_category_name from pop_data a join domain_category_only b on a.domain=b.domain) c group by parent_category_name, hour"

    df_domain = rbidf.select_dataframe(q1)
    df_domain_hour = rbidf.select_dataframe(q2)
    df_category = rbidf.select_dataframe(q3)
    df_cat_hour = rbidf.select_dataframe(q4)

    df_domain.columns = ["domain","count"]
    
    df_category.columns = ["category","count"]

    df_domain_hour.columns = ["count", "hour", "domain"]

    df_cat_hour.columns = ["count", "hour", "category"]
    
    return (df_domain, df_category, df_domain_hour, df_cat_hour)

def transform_domains(df):

    assert "domain" in df.columns
    assert len(df) > 0

    transformed = df

    transformed['total_users'] = USERS
    transformed['pct_users'] = transformed['count']/ float(len(df))
    transformed['idf'] = 1./ transformed['pct_users']
    
    cols = transformed.columns

    transformed = transformed[transformed['count']>=2]

    assert len(transformed) > 0
    assert "domain" in cols
    assert "count" in cols
    assert "total_users" in cols
    assert "pct_users" in cols
    assert "idf" in cols

    return transformed

def transform_category(df):
    
    assert "category" in df.columns
    assert len(df) > 0

    transformed = df

    transformed['total_users'] = USERS
    transformed['pct_users'] = transformed['count']/ float(len(df))
    transformed['idf'] = 1./ transformed['pct_users']

    cols = transformed.columns

    assert len(transformed) > 0
    assert "category" in cols
    assert "count" in cols
    assert "total_users" in cols
    assert "pct_users" in cols
    assert "idf" in cols

    return transformed

def transform_domains_hourly(df):

    assert "domain" in df.columns
    assert len(df) > 0

    transformed = df

    transformed['total_users'] = USERS
    transformed['pct_users'] = transformed['count']/ float(len(df))
    transformed['idf'] = 1./ transformed['pct_users']

    cols = transformed.columns

    transformed = transformed[transformed['count']>=2]

    assert len(transformed) > 0
    assert "domain" in cols
    assert "count" in cols
    assert "total_users" in cols
    assert "pct_users" in cols
    assert "idf" in cols

    return transformed

def transform_category_hourly(df):

    assert "category" in df.columns
    assert len(df) > 0

    transformed = df

    transformed['total_users'] = USERS
    transformed['pct_users'] = transformed['count']/ float(len(df))
    transformed['idf'] = 1./ transformed['pct_users']

    cols = transformed.columns

    assert len(transformed) > 0
    assert "category" in cols
    assert "count" in cols
    assert "total_users" in cols
    assert "pct_users" in cols
    assert "idf" in cols

    return transformed

def write_to_sql_idf(db,df,key,tbl_name, write_columns=False):
    from lib.appnexus_reporting.load import DataLoader
    loader = DataLoader(db)
    #key = "domain"
    columns = df.columns if not write_columns else write_columns
    loader.insert_df(df.reset_index(),tbl_name,[key],columns)

def run(console,cass,crusher,db):
   
    categories = db.select_dataframe('select domain, case when parent_category_name = "" then category_name else parent_category_name end as parent_category_name from domain_category_only')
    
    domain_cats={}
    for item in categories.iterrows():
        domain_cats[item[1]['domain']] = item[1]['parent_category_name']
    
    df_domain, df_category, df_domain_hour, df_cat_hour = extract(cass,db, domain_cats)
    #DATA EXTRACTED
    logging.info("data extracted with %d rows" %len(df_domain))
    
    ################
    #if len(df) == 0:
    #    logging.info("no data")
    #    return
    ################

    df_domain = transform_domains(df_domain)
    df_category = transform_category(df_category)
    df_domain_hourly = transform_domains_hourly(df_domain_hour)
    df_category_hourly = transform_category_hourly(df_cat_hour)

    logging.info("aggregated to %d domains" %len(df_domain))

    import datetime
    df_domain['date'] = datetime.datetime.now().strftime("%y-%m-%d")
    write_to_sql_idf(db,df_domain, "domain","domain_idf_log")
    write_to_sql_idf(db,df_domain, "domain","new_domain_idf", write_columns = ['domain', 'idf', 'count', 'total_users', 'pct_users'])
    write_to_sql_idf(db,df_category, "category","category_idf")
    write_to_sql_idf(db,df_domain_hourly, "domain","domain_idf_hour")
    write_to_sql_idf(db,df_category_hourly, "category","category_idf_hour")


if __name__ == "__main__":

    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)

    parse_command_line()
    basicConfig(options=options)
    
    from link import lnk
    
    console = lnk.api.console
    cass = lnk.dbs.cassandra
    rbidf = lnk.dbs.rockerboxidf

    crusher = lnk.api.crusher

    run(console, cass, crusher, rbidf)
