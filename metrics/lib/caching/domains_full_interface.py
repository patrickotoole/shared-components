import requests, json, logging, pandas, pickle
from lib.zookeeper import CustomQueue
from link import lnk
import datetime
from kazoo.client import KazooClient
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()
current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

QUERY ="INSERT INTO full_domain_cache_test (advertiser, url, count, uniques) VALUES ('{}', '{}',{}, {})"
CASSQUERY=""

class CacheFullURL():
    
    def __init__(self, connectors):
        self.connectors = connectors
        self.zookeeper = connectors['zk']

    def run_local(self, advertiser, pattern, base_url, filter_id):
        import domains_full_runner as cc
        kwargs = {"advertiser":advertiser, "pattern":pattern, "base_url":base_url, "filter_id":filter_id, "connectors":connectors}
        cc.runner(**kwargs)

    def run_on_work_queue(self,advertiser, pattern, base_url, filter_id):
        import lib.caching.domains_full_runner as furc
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        kwargs = {"advertiser":advertiser, "pattern":pattern, "base_url":base_url,"identifiers":"domains_full", "filter_id":filter_id}
        work = pickle.dumps((
                furc.runner,
                kwargs
                ))
        volume = "v{}".format(datetime.datetime.now().strftime('%m%y'))
        CustomQueue.CustomQueue(self.zookeeper,"python_queue", "log", volume).put(work,1)
        logging.info("added to work queue %s for %s" %(pattern,advertiser))
        

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="")
    define("run_local", default=False)
    define("base_url", "http://beta.crusher.getrockerbox.com")
    define("run_all", default=False)
    define("filter_id", default=False)

    basicConfig(options={})

    parse_command_line() 

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'crushercache':lnk.dbs.crushercache, 'zk':zk, 'cassandra':''}
    cfu = CacheFullURL(connectors)
    if options.run_local:
        if options.run_all:
            rockerbox_db = lnk.dbs.rockerbox
            segs = rockerbox_db.select_dataframe("select distinct url_pattern, action_id from action_with_patterns where pixel_source_name='{}'".format(options.advertiser))
            for seg in segs.iterrows():
                try:
                    cfu.run_local(options.advertiser, seg[1]['url_pattern'],options.base_url, seg[1]['action_id'])
                except:
                    print "error with {}".format(seg[1]['url_pattern'])
        else:
            cfu.run_local(options.advertiser, options.pattern, options.base_url, options.filter_id)
    else:
        rockerbox_db = lnk.dbs.rockerbox
        adverts = rockerbox_db.select_dataframe("select distinct pixel_source_name from action_with_patterns")
        for ad in adverts.iterrows():
            query = "select distinct action_id, url_pattern from action_with_patterns where pixel_source_name='{}'".format(ad[1]['pixel_source_name'])
            segs = rockerbox_db.select_dataframe(query)
            for seg in segs.iterrows():
                try:
                    cfu.run_on_work_queue(options.advertiser, seg[1]['url_pattern'], options.base_url, seg[1]['action_id'])
                except:
                    print "error with {}".format(seg[1]['url_pattern'])

