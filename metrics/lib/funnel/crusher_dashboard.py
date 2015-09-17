from lib.cassandra_helpers.statement import CassandraStatement
from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import simple_append
from datetime import timedelta, datetime, date
import pandas as pd
from link import lnk

c = lnk.dbs.cassandra
st = CassandraStatement(c)
db = lnk.dbs.rockerbox

base_query = """
select * 
from rockerbox.advertiser_uids
where 
    source='%(advertiser)s' and 
    date='%(date)s' and 
    uid2 IN (%(in_clause)s)
"""

replace_query = """
REPLACE INTO reporting.advertiser_daily_stats 
    (advertiser, date, views, visitors, engaged, advertising_ops) 
VALUES 
    ('%(advertiser)s', '%(date)s', %(views)s, %(visitors)s, %(engaged)s, %(advertising_ops)s)
"""

def get_advertisers():
    query = "select pixel_source_name from rockerbox.advertiser where deleted=0 and active=1"
    return db.select_dataframe(query).pixel_source_name.tolist()

def get_in_clause():
    uids = ['0' + str(i) for i in range(0, 10)] + [str(i) for i in range(10, 100)]
    in_clause = ','.join(["'%s'" % u for u in uids])
    return in_clause

def run_uids_to_domains(uids, select):
    statement = c.prepare(select)
    to_bind = st.bind_and_execute(statement)
    
    print "Unique user ids :%s" % len(uids)
    # uids needs to be like [[u1],[u2]], not [u1, u2]
    results = FutureHelpers.future_queue([[u] for u in uids],to_bind,simple_append,60,[])
    results = results[0]
    
    df = pd.DataFrame(results)

    print "Number of results: %s" % len(df)
    
    return df

def get_offsite_stats(uids):
    # uid date domain timestamp
    DOMAIN_SELECT = "select * from rockerbox.visitor_domains where uid = ?"
    return run_uids_to_domains(uids, DOMAIN_SELECT)

def get_advertiser_stats(advertiser, in_clause, date, engagement_threshold=5):
    params = {
        "in_clause": in_clause,
        "advertiser": advertiser,
        "date": date
        }
    q = base_query % params
    try:
        df = c.select_dataframe(q)
    except Exception as e:
        print e
        raise Exception("Query failed: %s" % q)
    if len(df) > 0:
        counts = df.uid.value_counts()
        uids = counts.index.tolist()
        offsite_df = get_offsite_stats(uids)

        data = {
            "advertiser": advertiser,
            "date": date,
            "views": len(df),
            "visitors": len(counts),
            "engaged": len(counts[counts >= engagement_threshold]),
            "advertising_ops": len(offsite_df)
            # top domains (offset by tfidf)
            # top categories (offset by tfidf)
        }
        insert_row(data)

def get_dates():
    fmt = "%Y-%m-%d %H:%M:%S"
    today = datetime.utcnow().date().strftime(fmt)
    yesterday = (datetime.utcnow() - timedelta(days=1)).date().strftime(fmt)
    two_days_ago = (datetime.utcnow() - timedelta(days=2)).date().strftime(fmt)
    three_days_ago = (datetime.utcnow() - timedelta(days=3)).date().strftime(fmt)

    return [
        two_days_ago,
        three_days_ago,
        today,
        yesterday
        ]

def insert_row(data):
    print data
    q = replace_query % data
    db.execute(q)

advertisers = get_advertisers()
in_clause = get_in_clause()
dates = get_dates()

print dates

#advertisers = ["baublebar", "bigstock", "jackthreads"]

for a in advertisers:
    for date in dates:
        get_advertiser_stats(a, in_clause, date)
