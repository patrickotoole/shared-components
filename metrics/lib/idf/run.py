import pandas as pd
from collections import Counter
import logging
from handlers.analytics.domains import cassandra
import pandas

POP_QUERY = ''' SELECT domains, num_imps FROM pop_uid_domains '''

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
    for chunk in chunks(uids,10):
        ll = [_url%ui for ui in chunk ]
        genr = (grequests.get(l,cookies=crusher._token) for l in ll)
        r = grequests.map(genr)
        for user in r:
            try:
                temp_dict = {}
                all_users_domains.extend(user.json())
                temp_uid = user.json()[0]['uid']
                temp_dict['uid']=temp_uid 
                temp_dict['domains'] = [u['domain'] for u in user.json()]
                aud.append(temp_dict)
            except:
                all_users_domains.extend({})
    return aud


def extract(hive, cassandra):
    #cassandra = lnk.dbs.cassandra
    ds = "select distinct uid from rockerbox.visitor_domains_full limit 100000"
    statement = cassandra.prepare(ds)
    uids_dict = cassandra.execute(statement)
    uids = [u['uid'] for u in uids_dict]
    
    crusher = lnk.api.crusher
    crusher.user = "a_rockerbox"
    crusher.password="admin"
    crusher.authenticate()   

    data = request_data(crusher, uids)
    total_df = pandas.DataFrame(data)
    
    return total_df

def transform(df):

    assert "domains" in df.columns
    assert len(df) > 0

    df['domains'] = df['domains'].apply(ast.literal_eval)
    transformed = to_domain_count(df)
    transformed['total_users'] = len(df)
    transformed['pct_users'] = transformed['count']/ float(len(df))
    transformed['idf'] = 1./ transformed['pct_users']
    transformed = transformed[transformed['count']>=10]
    cols = transformed.columns

    assert len(transformed) > 0
    assert "domain" in cols
    assert "count" in cols
    assert "total_users" in cols
    assert "pct_users" in cols
    assert "idf" in cols


    return transformed

def write_to_sql(db,df):
    from lib.appnexus_reporting.load import DataLoader

    loader = DataLoader(db)
    key = "domain"
    columns = df.columns
    loader.insert_df(df,"domain_idf",["domain"],columns)

def run(hive,db,console):
    
    df = extract(hive)
    logging.info("data extracted with %d rows" %len(df))

    if len(df) == 0:
        logging.info("no data")
        return

    df = transform(df)
    logging.info("aggregated to %d domains" %len(df))

    from appnexus_category import AppnexusCategory
    ac = AppnexusCategory(console)
    categories = ac.get_domain_category_name(df.head(100).domain.tolist())

    import time
    for i,_df in df.groupby(pd.np.arange(len(df))//100):
        logging.info("getting categories for batch %s" %i)
        if i:
            _cats = ac.get_domain_category_name([i for i in _df.domain.tolist() if len(i) < 30 and not i.startswith(".")])
            categories = pd.concat([categories,_cats])
            time.sleep(2)

    logging.info("got categories for %d domains" %len(df))   
   
    merged = df.merge(categories,on="domain",how="left").fillna("")

    logging.info("writing to sql")
    write_to_sql(db,merged)

if __name__ == "__main__":

    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)

    parse_command_line()
    basicConfig(options=options)
    
    from link import lnk
    hive = lnk.dbs.hive
    console = lnk.api.console
    crushercache = lnk.dbs.crushercache

    run(hive,crushercache,console)
