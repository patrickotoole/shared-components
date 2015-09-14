from lib.cassandra_helpers.cache import CassandraCache
from datetime import timedelta, datetime, date
from link import lnk

c = lnk.dbs.cassandra
db = lnk.dbs.rockerbox

base_query = """
select * 
from rockerbox.advertiser_uids
where 
    source='%(advertiser)s' and 
    date='%(date)s' and 
    uid2 IN (%(in_clause)s)
"""

def get_advertisers():
    query = "select pixel_source_name from rockerbox.advertiser where deleted=0 and active=1"
    return db.select_dataframe(query).pixel_source_name.tolist()

def get_in_clause():
    uids = ['0' + str(i) for i in range(0, 10)] + [str(i) for i in range(10, 100)]
    in_clause = ','.join(["'%s'" % u for u in uids])
    return in_clause

def get_offsite_stats(uids):
    in_clause = "(%s)" % ','.join(["'%s'" % u for u in uids])
    query = "SELECT * FROM rockerbox.visitor_domains WHERE uid IN %s" % in_clause
    return c.select_dataframe(query)

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
        
        # uids = counts.index.tolist()
        
        # offsite_df = get_offsite_stats(uids)
        # print offsite_df

        data = {
            "advertiser": advertiser,
            "date": date,
            "views": len(df),
            "visitors": len(counts),
            "engaged": len(counts[counts >= engagement_threshold])
            # advertising oppurtuntities
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
        today, 
        yesterday
        ]

def insert_row(data):
    print data
    query = "REPLACE INTO reporting.advertiser_daily_stats (advertiser, date, views, visitors, engaged) VALUES ('%(advertiser)s', '%(date)s', %(views)s, %(visitors)s, %(engaged)s)"
    q = query % data
    db.execute(q)

advertisers = get_advertisers()
in_clause = get_in_clause()
dates = get_dates()

print dates

for a in advertisers:
    for date in dates:
        get_advertiser_stats(a, in_clause, date)
