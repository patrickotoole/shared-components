import requests, json, logging, pandas

from link import lnk
import datetime
from kazoo.client import KazooClient


logger = logging.getLogger()

SQL_QUERY1 = "insert into uids_only_visits_cache (advertiser, pattern, num_visits, visit_user_count) values ('{}', '{}', {}, {})"
SQL_QUERY2 = "insert into uids_only_sessions_cache (advertiser, pattern, num_sessions, sessions_user_count) values ('{}', '{}', {}, {})"

def get_connectors():
    from link import lnk
    return {
        "db": lnk.dbs.rockerbox,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
        }


def make_request(advertiser, pattern, base_url):

    crusher = lnk.api.crusher
    crusher.user = "a_"+advertiser
    crusher.password="admin"
    crusher.base_url = base_url
    crusher.authenticate()

    url = "/crusher/pattern_search/uids_only?search={}"
    response = crusher.get(url.format(pattern))
    
    d1 = response.json["results"]["sessions"]
    df = pandas.DataFrame(d1.items())
    df.columns = ["col1", "col2"]
    df2 = df.groupby("col1").apply(lambda x: pandas.DataFrame(x["col2"].iloc[0]).set_index('date'))
        
    df3 = df2.groupby(level=0).apply(lambda x: pandas.Series({"sessions":len(x), "visits":sum(x["visits"])}))
        
    agg_visits = df3.groupby("visits").count()
    final_agg_visits = agg_visits.reset_index()
    final_agg_visits.columns = ["visits", "users_count"]

    agg_sessions = df3.groupby("sessions").count()
    final_agg_sessions = agg_sessions.reset_index()
    final_agg_sessions.columns = ["sessions", "users_count"]

    data = {"visits" : final_agg_visits, "sessions": final_agg_sessions}

    return data

def write_to_table_visits(advertiser, pattern, data,db):
    db.execute(SQL_QUERY1.format(advertiser, pattern, data["visits"], data["users_count"]))

def write_to_table_sessions(advertiser, pattern, data,db):
    db.execute(SQL_QUERY2.format(advertiser, pattern, data["sessions"], data["users_count"]))


def runner(advertiser, pattern, base_url, cache_date, indentifiers="test", connectors=False):
    connectors = connectors or get_connectors()

    db = connectors['db']
    data = make_request(advertiser, pattern, base_url)
    for i in range(0, len(data["visits"])):
        write_to_table_visits(advertiser, pattern, data["visits"].ix[i], connectors['db'])
    for i in range(0, len(data["sessions"])):
        write_to_table_sessions(advertiser, pattern, data["sessions"].ix[i], connectors['db'])