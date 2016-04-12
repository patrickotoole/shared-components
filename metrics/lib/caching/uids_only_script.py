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
        uoc.runner(advertiser,pattern,base_url,self.connectors)

    def run_on_work_queue(self, advertiser, pattern, base_url):
        import lib.caching.uids_only_cache as uoc
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
            uoc.runner,
            [advertiser,pattern, base_url, _cache_yesterday, _cache_yesterday + "uids_only"]
            ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)



if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("password", default="")
    define("base_url", default="http://beta.crusher.getrockerbox.com")
    define("pattern", default="")
    define("run_local", default=False)
    define("run_all", default=False)

    basicConfig(options={})

    parse_command_line()
    sql = lnk.dbs.rockerbox
   
    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'crushercache':lnk.dbs.crushercache, 'db':sql,'zk':zk}
    if options.run_local and not options.run_all:
        sql = lnk.dbs.crushercache
        cuid = CacheUIDS({'crushercache':lnk.dbs.crushercache, 'db':sql,'zk':zk})
        cuid.run_local(options.advertiser, options.pattern,options.base_url)
    
    elif options.run_local and options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'crushercache':lnk.dbs.crushercache, 'db':sql,'zk':zk})
        all_advertiser = sql.select_dataframe("select pixel_source_name from rockerbox.advertiser where crusher = 1")
        for advertiser in all_advertiser.iterrows():
            segments = sql.select_dataframe("select url_pattern from rockerbox.action_with_patterns where pixel_source_name = '{}'".format(advertiser[1]['pixel_source_name']))
            for pattern in segments.iterrows():
                cuid.run_local(advertiser[1]['pixel_source_name'], pattern[1]['url_pattern'],options.base_url)

    elif not options.run_local and options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'crushercache':lnk.dbs.crushercache, 'db':sql,'zk':zk})
        all_advertiser = sql.select_dataframe("select pixel_source_name from rockerbox.advertiser where crusher = 1")
        for advertiser in allPadvertiser:
            segments = sql.select_dataframe("select url_pattern from rockerbox.action_with_patterns where pixel_source_name = '{}'".format(advertiser))
            for pattern in segment:
                cuid.run_on_work_queue(advertiser, pattern,options.base_url)

    elif not options.run_local and not options.run_all:
        sql = lnk.dbs.rockerbox
        cuid = CacheUIDS({'crushercache':lnk.dbs.crushercache, 'db':sql,'zk':zk})
        cuid.run_on_work_queue(options.advertiser, options.pattern,options.base_url) 
    
