import pickle, pandas
import lib.caching.cache_uid_cassandra as cc
from link import lnk
from handlers.analytics.search.cache.pattern_search_cache import PatternSearchCache
from handlers.analytics.visit_domains_full import VisitDomainsFullHandler

QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques) VALUES ('{}', '{}',{}, {})"
CASSQUERY=""


def build_datelist(numdays):
    import datetime

    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def make_request(pattern,crusher_api, sql):
    dates = build_datelist(7)
    args = [advertiser,pattern,dates]

    psc = PatternSeachCache()
    uids = psc.get_uids_from_cache(*args)

    uids = list(set([u['uid'] for u in uids]))
    date_clause = self.make_date_clause("date",date,"","")

    vdf = VisitDomainsFullHandler(db=sql)
    results = vdf.full_get_w_agg_in(uids, date_clause)

    import ipdb; ipdb.set_trace()
    urls = pandas.DataFrame(results) 
    return urls

def add_to_table(advertiser_name, url, sql):
    #self.cassandra.execute(CASSQUERY)
    advertiser = advertiser_name.replace("a_", "")
    sql.execute(QUERY.format(advertiser, url["url"], url["count"],url["uniques"]))

def run_wrapper(advertiser_name, pattern, connectors):
    crusher = lnk.api.crusher
    crusher.user="a_"+advertiser_name
    crusher.password="admin"
    crusher.authenticate()
    urls = make_request(pattern, crusher, connectors['db'])
    for url in urls:
        add_to_table(advertiser_name, url, connectors['db'])
