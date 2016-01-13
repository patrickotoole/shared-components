import requests, json, logging, pandas
from pandas.io.json import json_normalize
from link import lnk
from lib.pandas_sql import s as _sql

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

class ActionCache:

	def __init__(self, username, password, con):
		self.username = username
		self.password = password
		self.con = con
		self.req = requests
		self.sql_query = _sql._write_mysql

	def auth(self):
		auth_data = "{\"username\":\"%s\",\"password\":\"%s\"}" % (self.username, self.password)
		resp = self.req.post("http://crusher.getrockerbox.com/login", data=auth_data)
		self.cookie = dict(resp.cookies)
		print self.username
		logging.info("cookie received for advertiser  username: %s" % self.username)
		logging.info("cookie is %s" % self.cookie)

	def get_segments(self):
		url = "http://crusher.getrockerbox.com/crusher/funnel/action?format=json"
		results = self.req.get(url,cookies=self.cookie)
		raw_results = results.json()['response']
		segments = []
		for result in raw_results:
			single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
			segments.append(single_seg)
		logging.info("returned %s segments for advertiser %s" % (len(segments), self.username))
		return segments

	def make_request(self, url_pattern, advertiser, action_name, action_id):
		logging.info("calling segment %s" % url_pattern[0])
		url = "http://crusher.getrockerbox.com/crusher/pattern_search/timeseries?search=%s&num_days=2" % url_pattern[0]
		results = self.req.get(url, cookies=self.cookie)
		df = pandas.DataFrame()
		try:	
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


	def insert(self, frame, table_name, columns, con, keys):
                batch_num = int(len(frame) / 50)+1
                for batch in range(0, batch_num):
			if batch==0:
                        	to_insert = frame.ix[0:50]
			else:
				to_insert = frame.ix[batch*50+1:(batch+1)*50]	
			if len(to_insert)>0:
				self.sql_query(to_insert, table_name, columns, con, keys)
				logging.info("inserted %s records for advertiser username (includes a_) %s" % (len(to_insert), self.username))

	def seg_loop(self, segments, advertiser):
		for seg in segments:
			res = self.make_request(seg["url_pattern"],advertiser,seg["action_name"], seg["action_id"])
			if(len(res)>=1):
				self.insert(res, "action_dashboard_cache", list(res.columns), segs.con, ['advertiser', 'action_id', 'domain'])


def get_all_advertisers():
	connect = lnk.dbs.rockerbox
	ad_df = connect.select_dataframe("select pixel_source_name from advertiser where active=1 and deleted=0 and running=1")
	advertiser_list = []
	for index, ad in ad_df.iterrows():
		print ad[0]
		username = "a_%s" % str(ad[0])
		password = "admin"
		advertiser_list.append([username,password])
	return advertiser_list
	
if __name__ == "__main__":
	advertiser_list = get_all_advertisers()

	for advert in advertiser_list:
		segs = ActionCache(advert[0], advert[1], lnk.dbs.rockerbox)
		segs.auth()
		s=segs.get_segments()
		advertiser_name = str(advert[0].replace("a_",""))
		segs.seg_loop(s, advertiser_name)



