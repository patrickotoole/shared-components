import pandas as pd
from collections import Counter
import logging
import pandas
import time

from lib.cassandra_cache.pattern_cache import CacheBase

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


def extract(cassandra, crusher):
    #cassandra = lnk.dbs.cassandra
    ds = "select distinct uid from rockerbox.visitor_domains_full limit 200000"
    statement = cassandra.prepare(ds)
    futures_result = cassandra.select_async(statement)
    import time
    time.sleep(5)
    uids_dict = futures_result.result()
    uids = [u['uid'] for u in uids_dict]
    

    reader = Reader(cassandra)
    data = reader.get_domain_uids(uids,"select * from rockerbox.visitor_domains_full where uid = ?")
    
    cassandra._wrapped.shutdown() 
    cassandra._wrapped.cluster.shutdown() 
 
    return data

def transform(df):

    assert "domain" in df.columns
    assert len(df) > 0


    user_count = df.groupby("domain")['uid'].agg(lambda x: len(set(x)))
    user_count.name = "count"
    transformed = user_count.reset_index()

    transformed['total_users'] = len(df.uid.unique())
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


def write_to_sql_idf(db,df):
    from lib.appnexus_reporting.load import DataLoader

    loader = DataLoader(db)
    key = "domain"
    columns = df.columns
    loader.insert_df(df.reset_index(),"domain_idf_only",["domain"],columns)

def run(console,cass,crusher,db):
    
    df = extract(cass,crusher)
    logging.info("data extracted with %d rows" %len(df))
    
    if len(df) == 0:
        logging.info("no data")
        return

    df = transform(df)
    logging.info("aggregated to %d domains" %len(df))

    write_to_sql_idf(db, df)


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
