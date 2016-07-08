import pandas as pd
import ast
from collections import Counter
import logging

POP_QUERY = ''' SELECT domains, num_imps FROM pop_uid_domains '''

def to_domain_count(data):
    c = Counter()
    for d in data['domains']:
        c.update(d)
    domain_count =  pd.DataFrame.from_dict(c, orient='index').reset_index()
    domain_count.columns = ['domain','count']
    return domain_count

def extract(hive, cassandra):
    #cassandra = lnk.dbs.cassandra
    ds = "select uid from rockerbox.visitor_domains_full limit 100000"
    statement = cassandra.prepare(ds)
    uids_dict = cassandra.execute(statement)
    uids = [u['uid'] for u in uids_dict]
    vdc.cassandra = cassandra
    vdc.DOMAIN_SELECT = "select domain from rockerbox.visitor_domains_full where uid = ?"
    d1 = uids[0:10000]
    d2 = uids[10000:20000]
    d3 = uids[20000:30000]
    d4 = uids[30000:40000]
    d5 = uids[40000:50000]
    d6 = uids[50000:60000]
    d7 = uids[60000:70000]
    d8 = uids[70000:80000]
    d9 = uids[80000:90000]
    d10 = uids[90000:len(uids)-1]

    domains1 = vdc.get_domains_use_futures(d1, "")
    import ipdb; ipdb.set_trace()
    df = pandas.DataFrame(domains1)
    del(domains1)
    del(uids_dict)
    del(d1)
    del(uids)
    domains2 = vdc.get_domains_use_futures(d2, "")
    df2 = pandas.DataFrame(domains2)
    del(domains2)
    df = df.append(df2)
    del(df2)
    domains3 = vdc.get_domains_use_futures(d3, "")
    df3 = pandas.DataFrame(domains3)
    del(domains3)
    df = df.append(df3)
    
    domains4 = vdc.get_domains_use_futures(d4, "")
    df4 = pandas.DataFrame(domains4)
    del(domains4)
    df = df.append(df4)
    domains5 = vdc.get_domains_use_futures(d5, "")
    df5 = pandas.DataFrame(domains5)
    del(domains5)
    df = df.append(df5)
    domains6 = vdc.get_domains_use_futures(d6, "")
    df6 = pandas.DataFrame(domains6)
    del(domains6)
    df = df.append(df6)

    domains7 = vdc.get_domains_use_futures(d7, "")
    df7 = pandas.DataFrame(domains7)
    del(domains7)
    df = df.append(df7)
    domains8 = vdc.get_domains_use_futures(d8, "")
    df8 = pandas.DataFrame(domains8)
    del(domains8)
    df = df.append(df8)
    domains9 = vdc.get_domains_use_futures(d9, "")
    df9 = pandas.DataFrame(domains9)
    del(domains9)
    df = df.append(df9)
    domains10 = vdc.get_domains_use_futures(d10, "")
    df10 = pandas.DataFrame(domains10)
    del(domains10)
    df = df.append(df10)
    import ipdb; ipdb.set_trace()
    
    #df = hive.select_dataframe(POP_QUERY)
    df.columns = ['domains']
>>>>>>> d5b1499... idf run change
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

    from link import lnk
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)

    parse_command_line()
    basicConfig(options=options)


    hive = lnk.dbs.hive
    console = lnk.api.console
    crushercache = lnk.dbs.crushercache

    run(hive,crushercache,console)
