import requests, json, logging, pandas, pickle, work_queue

from link import lnk
import datetime
from kazoo.client import KazooClient

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

SQL_QUERY = "select pixel_source_name from rockerbox.advertiser where crusher=1 and deleted=0"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class TopicCache:
    def __init__(self, connectors):
        self.connectors = connectors

    def run_local(self, advertiser, segment, endpoint, base_url, filter_id, connectors):
        import lib.caching.topic_runner as runner
        runner.runner(advertiser, segment, endpoint, base_url, filter_id, connectors=connectors)

    def add_db_to_work_queue(self, advertiser, segment, endpoint, filter_id, base_url, num_days, preventsample):
        import lib.caching.module_cache_runner as runner
        # yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        # _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        # work = pickle.dumps((
        #         runner.runner,
        #         [advertiser,segment, endpoint, fiter_id, base_url, _cache_yesterday,_cache_yesterday + "modulecache"]
        #         ))
        # work_queue.SingleQueue(self.connectors['zk'],"python_queue").put(work,1)
        logging.info("added to MOdule work queue %s for %s" %(segment,advertiser)) 


if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default=False)
    define("run_local", default=True)
    define("filter_id", default=0)
    define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})
    parse_command_line()

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'db': lnk.dbs.rockerbox, 'crushercache':lnk.dbs.crushercache, 'zk':zk, 'cassandra':''}
    TC = TopicCache(connectors)

    if not options.pattern:
        Q = "select p.* from action a join action_patterns p on a.action_id = p.action_id  where a.featured = 1 and a.pixel_source_name = '{}'".format(options.advertiser)
        segments = connectors['db'].select_dataframe(Q)
        pattern_actions = [ {"url_pattern":s['url_pattern'], "action_id":s['action_id'] } for i,s in segments.iterrows()]
    else:
        pattern_actions = [ {"url_pattern": options.pattern, "action_id": options.filter_id} ]

    func = TC.run_local 
    env_params = [connectors]

    if not options.run_local:
        func = TC.add_db_to_work_queue
        env_params = []
   
    for s in pattern_actions:
        args = [options.advertiser, s['url_pattern'], "topic", options.base_url, s['action_id']] + env_params
        print args
        func(*args)
    
