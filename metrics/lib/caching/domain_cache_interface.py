import requests, json, logging, pandas, pickle
from lib.workqueue import CustomQueue
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import lib.cassandra_cache.run as cassandra_functions
from kazoo.client import KazooClient

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

SQL_QUERY = "select pixel_source_name from rockerbox.advertiser where crusher=1 and deleted=0"

SQL_REMOVE_OLD = "DELETE FROM action_dashboard_cache where update_time < (UNIX_TIMESTAMP() - %s)"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d")

class ActionCache:
    def __init__(self, connectors):
        self.connectors = connectors

    def run_local(self, advertiser, pattern, segment, base_url, filter_id, connectors):
        import lib.caching.domain_cache_runner as adc_runner
        adc_runner.runner(advertiser, pattern, segment, base_url, filter_id=filter_id, connectors=connectors)

    def add_db_to_work_queue(self, advertiser, pattern, segment, filter_id, base_url):
        import lib.caching.domain_cache_runner as adc_runner
        _cache_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        work = pickle.dumps((
                adc_runner.runner,
                [advertiser, pattern, segment, base_url,"domains", filter_id]
                ))
        CustomQueue(self.connectors['zk'],"python_queue").put(work,1)
        logging.info("added to DB work queue %s for %s" %(segment,advertiser)) 


if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("segment", default=False)
    define("pattern", default=False)
    define("run_local", default=False)
    define("base_url", default="http://beta.crusher.getrockerbox.com")
    define("run_all", default=False)
    define("filter_id", default=False)

    basicConfig(options={})

    parse_command_line()

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'crushercache':lnk.dbs.crushercache, 'zk':zk, 'cassandra':''}
    ckw = ActionCache(connectors)
    if options.run_local:
        if options.run_all:
            rockerbox_db = lnk.dbs.rockerbox
            segs = rockerbox_db.select_dataframe("select distinct url_pattern,action_id from action_with_patterns where pixel_source_name='{}'".format(options.advertiser))
            for seg in segs.iterrows():
                try:
                    ckw.run_local(options.advertiser, seg[1]['url_pattern'], False, options.base_url, seg[1]['action_id'], connectors=connectors)
                except:
                    print "issues with actions {}".format(seg[1]['action_name'])
        else:
            ckw.run_local(options.advertiser, options.pattern, options.segment,options.base_url, options.filter_id, connectors)
    else:
        ckw.add_db_to_work_queue(options.advertiser, options.pattern, options.segment, options.filter_id, options.base_url)

