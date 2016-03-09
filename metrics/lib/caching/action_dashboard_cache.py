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
    def __init__(self, username, password, con, zookeeper=None):
        self.username = username
        self.password = password
        self.con = con
        self.req = requests
        self.sql_query = _sql._write_mysql
        self.zookeeper = zookeeper

    def auth(self):
        data = {"username":self.username,"password":self.password}
        auth_data = json.dumps(data)
        resp = self.req.post("http://beta.crusher.getrockerbox.com/login", data=auth_data)
        self.cookie = dict(resp.cookies)
        logging.info("cookie received for advertiser  username: %s" % self.username)
        logging.info("cookie is %s" % self.cookie)

    def get_segments(self):
        url = "http://beta.crusher.getrockerbox.com/crusher/funnel/action?format=json"
        results = self.req.get(url,cookies=self.cookie)
        segments = []
        try:
            raw_results = results.json()['response']
            for result in raw_results:
                single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
                segments.append(single_seg)
            logging.info("returned %s segments for advertiser %s" % (len(segments), self.username))
        except:
            logging.error("error getting cookie for advertise with username: %s" % self.username)
        return segments

    def make_request(self, url_pattern, action_name, action_id,username):
        advertiser = self.username.replace("a_","")
        df = pandas.DataFrame()
        try:
            logging.info("calling segment %s" % url_pattern[0])
            url = "http://beta.crusher.getrockerbox.com/crusher/pattern_search/timeseries?search=%s&num_days=20" % url_pattern[0]
            results = self.req.get(url, cookies=self.cookie)
            logging.info("results for segment %s where %s" % (url_pattern[0], results))
            resultsAsJson = results.json()['domains']
            data = {}
            data['data'] = []
            for item in resultsAsJson:
                record = {}
                record['advertiser']=advertiser
                record['action_id']=int(action_id)
                record['action_name'] = action_name
                record['domain'] = item['domain']
                record['count'] = item['count']
                record['url_pattern'] = url_pattern[0]
                data['data'].append(record)
            df = pandas.DataFrame(data['data'])
            logging.info("API returned %s records and converted to dataframe for segment %s for advertiser %s" % (len(df), url_pattern, self.username))
        except:
            logging.error("Error with data response for advertiser %s segment %s" % (username, action_name))
        return df


    def insert(self, frame, table_name, con, keys):
        batch_num = int(len(frame) / 50)+1
        for batch in range(0, batch_num):
            if batch==0:
                to_insert = frame.ix[0:50]
                to_insert['update_date'] = [current_datetime] * len(to_insert)
            else:
                to_insert = frame.ix[batch*50+1:(batch+1)*50]
                to_insert['update_date'] = [current_datetime] * len(to_insert)
            if len(to_insert)>0:
                try:
                    to_insert['domain'] = to_insert['domain'].map(lambda x : x.encode('utf-8'))
                    self.sql_query(to_insert, table_name, list(to_insert.columns), con, keys)
                except:
                    logging.info("error with df %s" % str(to_insert))
                logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), self.username))

    def request_and_write(self,segment, advertiser ):
        res = self.make_request(segment["url_pattern"],advertiser,segment["action_name"], segment["action_id"])
        if(len(res)>=1):
            self.insert(res, "action_dashboard_cache2", self.con, ['advertiser', 'action_id', 'domain'])

    def add_to_work_queue(self, segment, advertiser):
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                cassandra_functions.run_recurring,
                [advertiser,segment["url_pattern"][0],_cache_yesterday,_cache_yesterday + "recurring"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,0)
        logging.info("added to work queue %s for %s" %(segment["url_pattern"][0],advertiser))

    def add_db_to_work_queue(self, segment, advertiser):
        import lib.caching.work_queue_caching as adc_runner
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                adc_runner.run_domains_cache,
                [advertiser,segment["url_pattern"][0], _cache_yesterday,_cache_yesterday + "domaincache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)
        logging.info("added to DB work queue %s for %s" %(segment["url_pattern"][0],advertiser)) 

    def add_keyword_to_work_queue(self, segment, advertiser):
        import lib.caching.keyword_cache as adc_runner
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                adc_runner.run_wrapper,
                [advertiser,segment["url_pattern"][0], "http://beta.crusher.getrockerbox.com", _cache_yesterday,_cache_yesterday + "keywordcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)
        logging.info("added to DB work queue %s for %s" %(segment["url_pattern"][0],advertiser))

    def add_full_url_to_work_queue(self, segment, advertiser):
        import lib.caching.full_url_cache as adc_runner
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
        work = pickle.dumps((
                adc_runner.run_wrapper,
                [advertiser,segment["url_pattern"][0], "http://beta.crusher.getrockerbox.com", _cache_yesterday,_cache_yesterday + "fullurlcache"]
                ))
        work_queue.SingleQueue(self.zookeeper,"python_queue").put(work,1)
        logging.info("added to DB work queue %s for %s" %(segment["url_pattern"][0],advertiser))

    def seg_loop(self, segments, advertiser):
        for seg in segments:
            self.add_db_to_work_queue(seg, advertiser)
            self.add_to_work_queue(seg, advertiser)
            self.add_full_url_to_work_queue(seg, advertiser)
            self.add_keyword_to_work_queue(seg, advertiser)

def get_all_advertisers(db_con):
    ad_df = db_con.select_dataframe(SQL_QUERY)
    advertiser_list = []
    for index, ad in ad_df.iterrows():
        username = "a_%s" % str(ad[0])
        password = "admin"
        advertiser_list.append([username,password])
    return advertiser_list

def run_all(db_connect, zk):
	advertiser_list = get_all_advertisers(db_connect)
	for advert in advertiser_list:
		segs = ActionCache(advert[0], advert[1], db_connect,zk)
		segs.auth()
		s=segs.get_segments()
		advertiser_name = str(advert[0].replace("a_",""))
		segs.seg_loop(s, advertiser_name)

def run_advertiser(ac, username):
	ac.auth()
	s = ac.get_segments()
	advertiser_name = str(options.username.replace("a_",""))
	ac.seg_loop(s,advertiser_name)

def select_segment(segment_name, json_data):
    segment = []
    single_seg ={}
    for res in json_data:
        if 'url_pattern' in res.keys() and type(res['url_pattern']) == list and res['action_name'].lower() == segment_name.lower():
            single_seg["url_pattern"] = res['url_pattern']
            single_seg["action_name"] = res['action_name']
            single_seg["action_id"] = res['action_id']
            segment.append(single_seg)
    return segment


def run_advertiser_segment(ac, segment_name):
    ac.auth()
    s = ac.get_segments()
    url = "http://beta.crusher.getrockerbox.com/crusher/funnel/action?format=json"
    results = ac.req.get(url,cookies=ac.cookie)
    segment = []
    try:
        logging.info("seg issue")
        logging.info("segments %s" % results)
        logging.info(results.text)
        logging.info(results.json())
        raw_results = results.json()['response']
        segment = select_segment(segment_name, raw_results)
        logging.info("selected segment about to make request")
        df = ac.make_request(segment[0]["url_pattern"],segment[0]["action_name"], segment[0]["action_id"], ac.username)
        logging.info("request made for %s" % segment[0]["url_pattern"])
        ac.insert(df,"action_dashboard_cache2", ac.con, ["advertiser", "action_id", "domain"])
    except:
		logging.error("Error with advertiser segment run for advertiser username %s and segment %s" % (ac.username, segment_name))


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

    basicConfig(options={})
    
    parse_command_line()

    
    if options.chronos ==True:
        zookeeper =KazooClient(hosts="zk1:2181")
        zookeeper.start()
        run_all(lnk.dbs.rockerbox, zookeeper)
    else:
        #if options.segment:
        zookeeper =KazooClient(hosts="zk1:2181")
        zookeeper.start()
        ac = ActionCache(options.username, options.password, lnk.dbs.rockerbox, zookeeper)
        run_advertiser(ac, options.username)
        #else:
        #zookeeper =KazooClient(hosts="zk1:2181")
        #zookeeper.start()
        #ac = ActionCache(options.username, options.password, lnk.dbs.rockerbox,zookeeper)
        #run_advertiser_segment(ac, options.segment)
    
    if options.remove_old == True:
        lnk.dbs.rockerbox.excute(SQL_REMOVE_OLD % options.remove_seconds)

