import requests, json, logging, pandas, pickle, work_queue
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

    def run_local(self, advertiser, pattern, base_url):
        import full_url_cache as cc
        cc.runner(advertiser,pattern,base_url,"test",connectors=self.connectors)

    def run_on_work_queue(self,advertiser, pattern):
        import lib.caching.full_url_cache as furc
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                furc.runner,
                [advertiser,pattern, _cache_yesterday, _cache_yesterday+"full_url"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)
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

    basicConfig(options={})

    parse_command_line() 

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'crushercache':lnk.dbs.crushercache, 'zk':zk, 'cassandra':''}
    cfu = CacheFullURL(connectors)
    if options.run_local:
        cfu.run_local(options.advertiser, options.pattern,options.base_url)
    else:
        cfu.run_on_work_queue(options.advertiser, options.pattern, options.base_url)

