import requests, json, logging, pandas, pickle, work_queue

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
UDFQUERY = "select udf from user_defined_functions where advertiser ={} or advertiser is NULL"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

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

    def add_to_work_queue(self, segment, advertiser):
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                cassandra_functions.run_recurring,
                [advertiser,segment["url_pattern"][0],_cache_yesterday,_cache_yesterday + "recurring"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,5)
        logging.info("added to work queue %s for %s" %(segment["url_pattern"][0],advertiser))

    def add_db_to_work_queue(self, segment, advertiser, base_url):
        import lib.caching.domain_cache_runner as adc_runner
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                adc_runner.runner,
                [advertiser,segment["url_pattern"][0], False, base_url, _cache_yesterday,_cache_yesterday + "domaincache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,20)
        logging.info("added to DB work queue %s for %s" %(segment["url_pattern"][0],advertiser)) 

    def add_full_url_to_work_queue(self, segment, advertiser, base_url):
        import lib.caching.domains_full_runner as adc_runner
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                adc_runner.runner,
                [advertiser,segment["url_pattern"][0], base_url , _cache_yesterday,_cache_yesterday + "fullurlcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,30)
        logging.info("added to full domain work queue %s for %s" %(segment["url_pattern"][0],advertiser))

    def add_udf_to_work_queue(self, segment, advertiser, base_url):
        import lib.caching.generic_udf_runner as gur
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        
        work = pickle.dumps((
                gur.runner,
                [advertiser, segment["url_pattern"][0], "before_and_after", base_url, _cache_yesterday,_cache_yesterday + "udfcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,25)
        logging.info("added udf to work queue for %s %s" %(segment,advertiser))

        work = pickle.dumps((
                gur.runner,
                [advertiser, segment["url_pattern"][0], "hourly", base_url, _cache_yesterday,_cache_yesterday + "udfcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,25)
        logging.info("added udf to work queue for %s %s" %(segment,advertiser))

        work = pickle.dumps((
                gur.runner,
                [advertiser, segment["url_pattern"][0], "sessions", base_url, _cache_yesterday,_cache_yesterday + "udfcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,25)
        logging.info("added udf to work queue for %s %s" %(segment,advertiser))

        work = pickle.dumps((
                gur.runner,
                [advertiser, segment["url_pattern"][0], "model", base_url, _cache_yesterday,_cache_yesterday + "udfcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,25)
        logging.info("added udf to work queue for %s %s" %(segment,advertiser))

        udfs = self.crusherdb.select_dataframe("select udf from user_defined_functions where advertiser='{}' or advertiser is NULL".format(advertiser))
        for uf in udfs.iterrows():
            work = pickle.dumps((
                    gur.runner,
                    [advertiser, segment["url_pattern"][0], uf[1]['udf'], base_url, _cache_yesterday,_cache_yesterday + "udfcache"]
                    ))
            work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,25)
            logging.info("added udf to work queue for %s %s" %(segment,advertiser))

    def seg_loop(self, segments, advertiser, base_url):
        for seg in segments:
            self.add_db_to_work_queue(seg, advertiser, base_url)
            self.add_to_work_queue(seg, advertiser)
            self.add_full_url_to_work_queue(seg, advertiser, base_url)
            self.add_udf_to_work_queue(seg, advertiser, base_url)

def run_clean_up(crushercache):
    import cache_date_remover_runner as CCU
    CCU.runner(crushercache)

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
    #Remove old records
    run_clean_up(cdb)

def run_advertiser(ac, advertiser_name, base_url):
	s = ac.get_segments()
	ac.seg_loop(s,advertiser_name, base_url)
        #Remove old records
        run_clean_up(ac.crusherdb)

def run_advertiser_segment(ac, advertiser, segment_name, base_url):
    segments = [segment_name]
    ac.seg_loop(segments, advertiser, base_url)

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("chronos",default=True)
    define("remove_old", default=False)
    define("remove_seconds", default="17280")
    define("username",  default="")
    define("password", default="")
    define("segment", default=False)
    define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})
    
    parse_command_line()

    
    if options.chronos ==True:
        zookeeper =KazooClient(hosts="zk1:2181")
        zookeeper.start()
        run_all(lnk.dbs.rockerbox, zookeeper, lnk.dbs.crushercache, options.base_url)
    else:
        if not options.segment:
            zookeeper =KazooClient(hosts="zk1:2181")
            zookeeper.start()
            crusher = lnk.api.crusher
            crusher.user = "a_{}".format(options.username)
            crusher.password="admin"
            crusher.base_url = options.base_url
            crusher.authenticate()
            ac = CacheInterface(options.username, crusher, lnk.dbs.rockerbox, lnk.dbs.crushercache, zookeeper)
            run_advertiser(ac, options.username, options.base_url)
        else:
            zookeeper =KazooClient(hosts="zk1:2181")
            zookeeper.start()
            crusher = lnk.api.crusher
            crusher.user = "a_{}".format(options.username)
            crusher.password="admin"
            crusher.base_url = options.base_url
            crusher.authenticate()
            ac = CacheInterface(options.username, crusher, lnk.dbs.rockerbox, lnk.dbs.crushercache,zookeeper)
            run_advertiser_segment(ac, options.username, options.segment, options.base_url)
    
    if options.remove_old == True:
        lnk.dbs.rockerbox.excute(SQL_REMOVE_OLD % options.remove_seconds)

