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
    
    def __init__(self, connectors):
        self.connectors = connectors

    def run_local(self, advertiser, pattern):
        import cache_uid_wrapper as cc
        cc.run_wrapper(advertiser,pattern,self.connectors)

    def run_on_work_queue(self, advertiser, pattern):
        import lib.caching.cache_uid_wrapper as cc
        work = pickle.dumps((
            cc.run_wrapper,
            [advertiser,pattern]
            ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,0)


if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="")

    basicConfig(options={})

    parse_command_line() 

    zk = KazooClient(hosts="zk1:2181")
    connectors = {'db':lnk.dbs.rockerbox, 'zk':zk, 'cassandra':''}
    cfu = CacheFullURL(connectors)
    cfu.run_local(options.advertiser, options.pattern)
