import requests, json, logging, pandas, pickle, work_queue
from pandas.io.json import json_normalize
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import lib.cassandra_cache.run as cassandra_functions
from kazoo.client import KazooClient
import pickle

QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques) VALUES ('{}', '{}',{}, {})"
CASSQUERY=""

class CacheFullURL():
    
    def __init__(self, api_wrapper, connectors):
        self.db = connectors['db']
        self.zookeeper = connectors['zk']
        self.cassandra = connectors['cassandra']
        self.api = api_wrapper

    def add_to_table(self,url):
        #self.cassandra.execute(CASSQUERY)
        advertiser = api_wrapper.user.replace("a_", "")
        self.db.execute(QUERY.format(advertiser, url["url"], url["count"],url["uniques"]))

    def make_request(self, pattern):
        url_pattern = '/crusher/onsite_domains_full?format=json&url_pattern={}'
        urls = self.api.get(url_pattern.format(pattern))
        return urls

    def run_on_work_queue(self, advertiser, pattern):
        import lib.caching.cassandra_uid_wrapper as cc
        #ADD to work queue
        work = pickle.dumps((
            cc.run_wrapper,
            [advertiser,pattern]
            ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,0)

    def run_local(self, advertiser, pattern):
        items  = self.make_request(pattern)
        for url in items:
            self.add_to_table(url)

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("username",  default="")
    define("password", default="")
    define("pattern", default="")

    basicConfig(options={})

    parse_command_line() 

    zk = KazooClient(hosts="zk1:2181")
    connectors = {'db':lnk.dbs.rockerbox, 'zk':zk, 'cassandra':''}
    api_wrapper = lnk.api.crusher
    api_wrapper.user = options.username
    api_wrapper.password = options.password
    api_wrapper.authenticate()
    cfu = CacheFullURL(api_wrapper, connectors)
    cfu.endpoint(options.username, options.pattern)
