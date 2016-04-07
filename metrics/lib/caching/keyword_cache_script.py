import requests, json, logging, pandas, pickle, work_queue
from link import lnk
import datetime
from kazoo.client import KazooClient
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()
current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

QUERY ="INSERT INTO keyword_crusher_cache (advertiser, url_pattern, keyword, count, uniques) VALUES ('{}', '{}','{}',{}, {})"

class CacheKeywords():
    
    def __init__(self, connectors):
        self.connectors = connectors
        self.zookeeper = connectors['zk']

    def run_local(self, advertiser, pattern, base_url):
        import keyword_cache as kc
        kc.runner(advertiser,pattern,base_url,"test",connectors=self.connectors)

    def run_on_work_queue(self,advertiser, pattern):
        import lib.caching.keyword_cache as kc
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                kc.runner,
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
    define("run_all", False)
    define("run_all_all", False)

    basicConfig(options={})

    parse_command_line() 

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'crushercache':lnk.dbs.crushercache, 'zk':zk, 'cassandra':''}
    ckw = CacheKeywords(connectors)
    if options.run_local:
        if options.run_all_all:
            rockerbox_db = lnk.dbs.rockerbox
            adverts = rockerbox_db.select_dataframe("select distcint pixel_source_name from action_with_patterns")
            for ad in adverts.iterrows():
                segs = rockerbox_db.select_dataframe("select distinct url_pattern from action_with_patterns where pixel_source_name='{}'".format(ad[1]['pixel_source_name'))
                for seg in segs.iterrows():
                    try:
                        cfu.run_local(options.advertiser, seg[1]['url_pattern'],options.base_url)
                    except:
                        print "error with {}".format(seg[1]['url_pattern'])
        elif options.run_all:
            rockerbox_db = lnk.dbs.rockerbox
            segs = rockerbox_db.select_dataframe("select distinct url_pattern from action_with_patterns where pixel_source_name='{}'".format(options.advertiser))
            for seg in segs.iterrows():
                try:
                    cfu.run_local(options.advertiser, seg[1]['url_pattern'],options.base_url)
                except:
                    print "error with {}".format(seg[1]['url_pattern'])
        else:
            ckw.run_local(options.advertiser, options.pattern,options.base_url)
    else:
        ckw.run_on_work_queue(options.advertiser, options.pattern, options.base_url)

