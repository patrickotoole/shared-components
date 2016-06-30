import requests, json, logging, pandas, pickle
from lib.zookeeper import CustomQueue
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
import lib.cassandra_cache.run as cassandra_functions
from kazoo.client import KazooClient
from lib.functionselector import FunctionSelector

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

SQL_QUERY = "select pixel_source_name from rockerbox.advertiser where crusher=1 and deleted=0"

SQL_REMOVE_OLD = "DELETE FROM action_dashboard_cache where update_time < (UNIX_TIMESTAMP() - %s)"
UDFQUERY = "select udf from user_defined_functions where advertiser ={} or advertiser is NULL"
UDFQUERY2 = "select name from rpc_function_details where is_recurring = 1 and active=1 and deleted=0"


current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
volume = "v{}".format(datetime.datetime.now().strftime('%m%y'))

FS = FunctionSelector()

class CacheInterface:
    def __init__(self, advertiser, crusher, db, crusherdb, zookeeper=None):
        self.advertiser = advertiser
        self.db = db
        self.crusherdb = crusherdb
        self.zookeeper = zookeeper
        self.crusher_api = crusher

    def get_segments(self):
        url = "/crusher/funnel/action?format=json"
        results = self.crusher_api.get(url)
        segments = []
        try:
            raw_results = results.json['response']
            for result in raw_results:
                single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
                segments.append(single_seg)
            logging.info("returned %s segments for advertiser %s" % (len(segments), self.advertiser))
        except:
            logging.error("error getting cookie for advertise with username: %s" % self.advertiser)
        return segments

    def add_recurring(self, segment, advertiser):
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        _cache_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        work = pickle.dumps((
                cassandra_functions.run_recurring,
                {"advertiser":advertiser,"pattern":segment["url_pattern"][0], "cache_date":_cache_yesterday, "identifier":"recurring_cassandra_cache"}
                ))
        CustomQueue.CustomQueue(self.zookeeper,"python_queue", "log", volume).put(work,5)
        logging.info("added to work queue %s for %s" %(segment["url_pattern"][0],advertiser))

    def add_udf_to_work_queue(self, segment, advertiser, base_url, udf):
        fn = FS.select_function(udf)
        cache_name = "udf_{}_cache"

        work = pickle.dumps((
                fn,
                {"advertiser":advertiser, "pattern":segment["url_pattern"][0], "func_name":udf, "base_url":base_url, "indentifiers":cache_name.format(udf), "filter_id":segment['action_id']}
                ))
        CustomQueue.CustomQueue(self.zookeeper,"python_queue", "log", volume).put(work,35)
        logging.info("added udf to work queue for %s %s" %(segment,advertiser))

    def get_udf_list(self):
        udf_df = self.crusherdb.select_dataframe(UDFQUERY2)
        return udf_df

    def seg_loop(self, segments, advertiser, base_url):
        for seg in segments:
            self.add_recurring(seg, advertiser)
            udf_df = self.get_udf_list()
            for udf in udf_df.iterrows():
                self.add_udf_to_work_queue(seg, advertiser, base_url, udf[1]['name'])

def get_all_advertisers(db_con):
    ad_df = db_con.select_dataframe(SQL_QUERY)
    advertiser_list = []
    for ad in ad_df.iterrows():
        username = ad[1]["pixel_source_name"]
        password = "admin"
        advertiser_list.append([username,password])
    return advertiser_list

def run_all(db, zk, cdb, base_url):
    advertiser_list = get_all_advertisers(db)
    for advert in advertiser_list:
        crusher_api = lnk.api.crusher
        crusher_api.user = "a_%s" % advert[0]
        crusher_api.password = "admin"
        crusher_api.authenticate()
        logging.info("received token for advertiser %s, token is %s" % (advert[0], crusher_api._token))
        advertiser_instance = CacheInterface(advert[0], crusher_api, db,cdb,zk)
        advertiser_segments=advertiser_instance.get_segments()
        advertiser_instance.seg_loop(advertiser_segments, advert[0], base_url)

def run_advertiser(ac, advertiser_name, base_url):
	s = ac.get_segments()
	ac.seg_loop(s,advertiser_name, base_url)

def run_advertiser_segment(ac, advertiser, segment_name, base_url):
    segments = [segment_name]
    ac.seg_loop(segments, advertiser, base_url)

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default=False)
    define("password", default="")
    define("segment", default=False)
    define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})
    
    parse_command_line()

    if not options.advertiser:
        zookeeper =KazooClient(hosts="zk1:2181")
        zookeeper.start()
        run_all(lnk.dbs.rockerbox, zookeeper, lnk.dbs.crushercache, options.base_url)
    else:
        if options.segment:
            zookeeper =KazooClient(hosts="zk1:2181")
            zookeeper.start()
            crusher = lnk.api.crusher
            crusher.user = "a_{}".format(options.username)
            crusher.password="admin"
            crusher.base_url = options.base_url
            crusher.authenticate()
            ac = CacheInterface(options.username, crusher, lnk.dbs.rockerbox, lnk.dbs.crushercache,zookeeper)
            run_advertiser_segment(ac, options.username, options.segment, options.base_url)
        else:
            zookeeper =KazooClient(hosts="zk1:2181")
            zookeeper.start()
            crusher = lnk.api.crusher
            crusher.user = "a_{}".format(options.username)
            crusher.password="admin"
            crusher.base_url = options.base_url
            crusher.authenticate()
            ac = CacheInterface(options.username, crusher, lnk.dbs.rockerbox, lnk.dbs.crushercache, zookeeper)
            run_advertiser(ac, options.username, options.base_url)


