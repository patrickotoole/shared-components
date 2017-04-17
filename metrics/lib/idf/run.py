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
    from cassandra.query import SimpleStatement
    statement = SimpleStatement(ds, fetch_size=1000)
    users = []
    for row_user in cassandra.execute(statement):
        users.append(row_user)
    uids = [u['uid'] for u in users]
    

    def cat_counter(key):
        def count_cat(result, results, *args):
            keys = set([ categories.get(k[key],"") for k in result ])
            results.update(list(keys))

        return count_cat

    def key_counter_hour(key):
        def count(result,results,*args):
            def get_domain_hour(x):
                hour = x['timestamp'].split(" ")[1].split(":")[0]
                return (hour, x[key])
            keys = set([ get_domain_hour(k) for k in result ])
            results.update(list(keys))

        return count

    def cat_counter_hour(key):
        def count_cat(result, results, *args):
            def get_cat_hour(x):
                hour = x['timestamp'].split(" ")[1].split(":")[0]
                return (hour, categories.get(x[key],""))
            keys = set([ get_cat_hour(k) for k in result ])
            results.update(list(keys))

        return count_cat

    from lib.cassandra_cache.helpers import key_counter
    
    def run_all(result,results,*args):
        fn1 = key_counter('domain')
        fn2 = cat_counter('domain')
        fn3 = key_counter_hour('domain')
        fn4 = cat_counter_hour('domain')
        fn1(result, results['domains'], *args)
        fn2(result, results['categories'], *args)
        fn3(result, results['domains_hour'], *args)
        fn4(result, results['category_hour'], *args)
        
    reader = Reader(cassandra)
    from collections import Counter
    Q = "select * from rockerbox.visitor_domains_full where uid = ?"
    counter = Counter()
    counter2 = Counter()
    counter3 = Counter()
    counter4 = Counter()
    count_obj = {"domains":counter, "categories":counter2, "domains_hour":counter3, "category_hour":counter4}
    
    data = reader.get_domain_uids(uids,Q,fn=run_all, obj=count_obj)
    
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
