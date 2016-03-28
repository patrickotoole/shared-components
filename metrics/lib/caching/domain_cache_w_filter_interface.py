import requests, json, logging, pandas, pickle, work_queue

from link import lnk
from lib.pandas_sql import s as _sql
import datetime
from kazoo.client import KazooClient

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

SQL_QUERY = "select pixel_source_name from rockerbox.advertiser where crusher=1 and deleted=0"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class DomainFilterCache:
    def __init__(self, connectors):
        self.connectors = connectors

    def run_local(self, advertiser, segment, endpoint, filter_id, base_url, connectors):
        import lib.caching.domain_cache_w_filter_runner as runner
        runner.runner(advertiser,segment, endpoint, filter_id, base_url, connectors=connectors)

    def add_db_to_work_queue(self, advertiser, segment, endpoint, filter_id, base_url):
        import lib.caching.domain_cache_w_filter_runner as runner
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                runner.runner,
                [advertiser,segment, endpoint, fiter_id, base_url, _cache_yesterday,_cache_yesterday + "modulecache"]
                ))
        work_queue.SingleQueue(self.connectors['zk'],"python_queue").put(work,1)
        logging.info("added to MOdule work queue %s for %s" %(segment,advertiser)) 


if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default=False)
    define("run_local", default=False)
    define("endpoint", default=False)
    define("filter_id", default=0)
    define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})

    parse_command_line()

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'db':lnk.dbs.rockerbox, 'zk':zk, 'cassandra':'', 'crushercache': lnk.dbs.crushercache}
    DC = DomainFilterCache(connectors)
    if options.run_local and options.pattern:
        DC.run_local(options.advertiser, options.pattern, options.endpoint, options.filter_id, options.base_url, connectors)
    elif options.run_local and not options.pattern:
        segments = connectors['db'].select_dataframe("select * from action_with_patterns where pixel_source_name = '{}'".format(options.advertiser))
        for i,s in segments.iterrows():
            DC.run_local(options.advertiser, s['url_pattern'], options.endpoint, s['action_id'], options.base_url, connectors)
    else:
        DC.add_db_to_work_queue(options.advertiser, options.pattern, options.endpoint, options.filter_id, options.base_url)

