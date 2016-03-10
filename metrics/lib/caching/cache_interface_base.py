import requests, json, logging, pandas, pickle, work_queue

from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import lib.cassandra_cache.run as cassandra_functions
from kazoo.client import KazooClient

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

SQL_QUERY = "select pixel_source_name from advertiser where crusher=1 and deleted=0"

SQL_REMOVE_OLD = "DELETE FROM action_dashboard_cache where update_time < (UNIX_TIMESTAMP() - %s)"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class ActionCache:
    def __init__(self, connectors):
        self.connectors = connectors

    def run_local(self, advertiser, segment, base_url, connectors):
        return True

    def add_to_work_queue(self, segment, advertiser):
        logging.info("added to DB work queue %s for %s" %(segment["url_pattern"][0],advertiser)) 


if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="")
    define("run_local", default=False)
    define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})

    parse_command_line()

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors = {'db':lnk.dbs.rockerbox, 'zk':zk, 'cassandra':''}
    ckw = ActionCache(connectors)
    if options.run_local:
        ckw.run_local(options.advertiser, options.pattern,options.base_url, connectors)
    else:
        ckw.add_db_to_work_queue(options.advertiser, options.pattern)

