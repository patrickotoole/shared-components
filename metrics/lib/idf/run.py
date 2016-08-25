import pandas as pd
from collections import Counter
import logging
import pandas
import time

from lib.cassandra_cache.pattern_cache import CacheBase
USERS = 200000

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

def request_data(crusher, uids):
    uids = list(set(uids))
    import grequests
    _url = "http://beta.crusher.getrockerbox.com/crusher/visit_domains?uid=%s&format=json"
    all_users_domains = []
    aud = []
    for chunk in chunks(uids,90):
        ll = [_url%ui for ui in chunk ]
        genr = (grequests.get(l,cookies=crusher._token,timeout=5) for l in ll)
        r = grequests.map(genr)
        for user in r:
            try:
                temp_dict = {}
                _j = user.json()
                if len(_j) > 0:
                    print len(_j)
                    all_users_domains.extend(_j)
                    temp_uid = _j[0]['uid']
                    temp_dict['uid'] = temp_uid 
                    temp_dict['domains'] = [u['domain'] for u in _j]
                    aud.append(temp_dict)
            except:
                logging.info("issue ")
                if user is not None: logging.info(user.content)
                all_users_domains.extend({})
                time.sleep(.1)
    return aud


def extract(cassandra, crusher, categories):
    ds = "select distinct uid from rockerbox.visitor_domains_full limit %s" % USERS
    statement = cassandra.prepare(ds)
    futures_result = cassandra.select_async(statement)
    import time
    time.sleep(5)
    uids_dict = futures_result.result()
    uids = [u['uid'] for u in uids_dict]
    

    reader = Reader(cassandra)
    from collections import Counter
    from lib.cassandra_cache.helpers import key_counter
    from lib.cassandra_cache.helpers import cat_counter
    from lib.cassandra_cache.helpers import key_counter_hour
    from lib.cassandra_cache.helpers import cat_counter_hour
    Q = "select * from rockerbox.visitor_domains_full where uid = ?"
    counter = Counter()
    counter2 = Counter()
    counter3 = Counter()
    counter4 = Counter()
    count_obj = {"domains":counter, "categories":counter2, "domains_hour":counter3, "category_hour":counter4}
    fns = {"domains":key_counter('domain'), "categories":cat_counter('domain'), "domains_hour":key_counter_hour('domain'), "category_hour":cat_counter_hour('domain') }
    
    data = reader.get_domain_uids(uids,Q,fn=fns, obj=count_obj,include_cat=True, categories=categories)
    
    df_domain = pandas.DataFrame({"count":data['domains']}).reset_index()
    df_domain.columns = ["domain","count"]
    
    df_category = pandas.DataFrame({"count":data['categories']}).reset_index()
    df_category.columns = ["category","count"]

    df_domain_hour = pandas.DataFrame(data['domains_hour'].keys(), data['domains_hour'].values()).reset_index()  
    df_domain_hour.columns = ["count", "hour", "domain"]

    df_cat_hour = pandas.DataFrame(data['category_hour'].keys(), data['category_hour'].values()).reset_index()
    df_cat_hour.columns = ["count", "hour", "category"]
    
    cassandra._wrapped.shutdown() 
    cassandra._wrapped.cluster.shutdown() 

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

def write_to_sql_idf(db,df,key,tbl_name):
    from lib.appnexus_reporting.load import DataLoader

    loader = DataLoader(db)
    #key = "domain"
    columns = df.columns
    loader.insert_df(df.reset_index(),tbl_name,[key],columns)

def run(console,cass,crusher,db):
   
    categories = db.select_dataframe('select domain, case when parent_category_name = "" then category_name else parent_category_name end as parent_category_name from domain_category_only')
    
    domain_cats={}
    for item in categories.iterrows():
        domain_cats[item[1]['domain']] = item[1]['parent_category_name']
    
    df_domain, df_category, df_domain_hour, df_cat_hour = extract(cass,crusher, domain_cats)
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

    write_to_sql_idf(db,df_domain, "domain","new_domain_idf")
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
    crushercache = lnk.dbs.crushercache

    crusher = lnk.api.crusher

    run(console, cass, crusher, crushercache)
