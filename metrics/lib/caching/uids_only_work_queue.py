import requests, json, logging, pandas, pickle, work_queue
from pandas.io.json import json_normalize
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import lib.cassandra_cache.run as cassandra_functions
from kazoo.client import KazooClient
import pickle


class CacheUIDS():
    
    def __init__(self, connectors):
        self.connectors = connectors
        self.zookeeper = connectors['zk']

    def run_local(self, advertiser, pattern, base_url):
        import uids_only_cache as uoc
        uoc.run_all(advertiser,pattern,base_url,self.connectors)

    def run_on_work_queue(self, advertiser, pattern, base_url):
        import lib.caching.uids_only_cache as uoc
        work = pickle.dumps((
            uoc.run_all,
            [advertiser,pattern, base_url]
            ))
        import ipdb; ipdb.set_trace()
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)



if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("username",  default="")
    define("password", default="")
    define("base_url", default="http://beta.crusher.getrockerbox.com")
    define("segment", default="")
    define("run_local", default=False)
    define("run_all", default=False)

    basicConfig(options={})

    parse_command_line()

    zk = KazooClient(hosts="zk1:2181")

    if options.run_local and not options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'db':sql,'zk':zk})
        cuid.run_local(options.username, options.segment,options.base_url)
    
    elif options.run_local and options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'db':sql, 'zk':zk})
        all_advertiser = sql.select_dataframe("select pixel_source_name from advertiser where crusher = 1")
        for advertiser in allPadvertiser:
            segments = sql.select_dataframe("select url_pattern from action_with_patterns where pixel_source_name = '{}'".format(advertiser))
            for pattern in segment:
                cuid.run_local(advertiser, pattern,options.base_url, connectors)

    elif not options.run_local and options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'db':sql, 'zk':zk})
        all_advertiser = sql.select_dataframe("select pixel_source_name from advertiser where crusher = 1")
        for advertiser in allPadvertiser:
            segments = sql.select_dataframe("select url_pattern from action_with_patterns where pixel_source_name = '{}'".format(advertiser))
            for pattern in segment:
                cuid.run_on_work_queue(advertiser, pattern,options.base_url)

    elif not options.run_local and not options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'db':sql,'zk':zk})
        cuid.run_on_work_queue(options.username, options.segment,options.base_url) 
    
