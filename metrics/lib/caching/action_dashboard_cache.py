import requests, json, logging, pandas
from pandas.io.json import json_normalize
from link import lnk
from lib.pandas_sql import s as _sql
import datetime

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

SQL_QUERY = "select pixel_source_name from advertiser where active=1 and deleted=0 and running=1"

SQL_REMOVE_OLD = "DELETE FROM action_dashboard_cache where update_time < (UNIX_TIMESTAMP() - %s)"

current_datetime = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

class ActionCache:
    def __init__(self, username, password, con):
        self.username = username
        self.password = password
        self.con = con
        self.req = requests
        self.sql_query = _sql._write_mysql

    def auth(self):
        data = {"username":self.username,"password":self.password}
        auth_data = json.dumps(data)
        resp = self.req.post("http://crusher.getrockerbox.com/login", data=auth_data)
        self.cookie = dict(resp.cookies)
        logging.info("cookie received for advertiser  username: %s" % self.username)
        logging.info("cookie is %s" % self.cookie)

    def get_segments(self):
        url = "http://crusher.getrockerbox.com/crusher/funnel/action?format=json"
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

    def make_request(self, url_pattern, advertiser, action_name, action_id):
        df = pandas.DataFrame()
        try:
            logging.info("calling segment %s" % url_pattern[0])
            url = "http://crusher.getrockerbox.com/crusher/pattern_search/timeseries?search=%s&num_days=2" % url_pattern[0]
            results = self.req.get(url, cookies=self.cookie)
            df = pandas.DataFrame()
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
                data['data'].append(record)
            df = json_normalize(data['data'])
            logging.info("API returned %s records and converted to dataframe for segment %s for advertiser %s" % (len(df), url_pattern, self.username))
        except:
            logging.error("Error with data response for advertiser username %s segment %s, text from response is %s" % (self.username, action_name, df))
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

    def seg_loop(self, segments, advertiser):
		for seg in segments:
			res = self.make_request(seg["url_pattern"],advertiser,seg["action_name"], seg["action_id"])
			if(len(res)>=1):
				self.insert(res, "action_dashboard_cache", self.con, ['advertiser', 'action_id', 'domain'])


def get_all_advertisers():
	connect = lnk.dbs.rockerbox
	ad_df = connect.select_dataframe(SQL_QUERY)
	advertiser_list = []
	for index, ad in ad_df.iterrows():
		username = "a_%s" % str(ad[0])
		password = "admin"
		advertiser_list.append([username,password])
	return advertiser_list

def run_all():
	advertiser_list = get_all_advertisers()
	for advert in advertiser_list:
		segs = ActionCache(advert[0], advert[1], lnk.dbs.rockerbox)
		segs.auth()
		s=segs.get_segments()
		advertiser_name = str(advert[0].replace("a_",""))
		segs.seg_loop(s, advertiser_name)

def run_advertiser(user, password):
	segs = ActionCache(user, password, lnk.dbs.rockerbox)
	segs.auth()
	s = segs.get_segments()
	advertiser_name = str(options.username.replace("a_",""))
	segs.seg_loop(s,advertiser_name)

def select_segment(segment_name, json_data):
	segment = []
	for result in json_data:
		try:
			if(result['url_pattern'][0] == segment_name):
				single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
				segment.append(single_seg)
		except:
			if(result['url_pattern'] == segment_name):
                                single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
                                segment.append(single_seg)
	return segment

def run_advertiser_segment(user, password, conn, segment_name):
	segs = ActionCache(user, password, conn)
	segs.auth()
	s = segs.get_segments()
	advertiser_name = str(user.replace("a_",""))
	url = "http://crusher.getrockerbox.com/crusher/funnel/action?format=json"
	results = segs.req.get(url,cookies=segs.cookie)
	segment = []
	try:
		raw_results = results.json()['response']
		segment = select_segment(segment_name, raw_results)
		df = segs.make_request(segment[0]["url_pattern"], advertiser_name, segment[0]["action_name"], segment[0]["action_id"])
		segs.insert(df,"action_dashboard_cache", conn, ["advertiser", "action_id", "domain"])
	except:
		logging.error("Error with advertiser segment run for advertiser username %s and segment %s" % (user, segment_name))

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
	define("segment", default = False)

	basicConfig(options={})
	parse_command_line()

	if options.chronos ==True:
		run_all()
	else:
		if options.segment == False:
			run_advertiser(options.username, options.password)
		else:
			run_advertiser_segment(options.username, options.password, lnk.dbs.rockerbox, options.segment)

	if options.remove_old == True:
		lnk.dbs.rockerbox.excute(SQL_REMOVE_OLD % options.remove_seconds)

