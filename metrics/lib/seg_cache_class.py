import requests, json, logging
from pandas.io.json import json_normalize
from link import lnk
from lib.pandas_sql import s as _sql

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

class seg_cache:

	def __init__(self, username, password):
		self.username = username
		self.password = password
		self.con = lnk.dbs.rockerbox 

	def auth(self):
		auth_data = "{\"username\":\"%s\",\"password\":\"%s\"}" % (self.username, self.password)
		resp = requests.post("http://crusher.getrockerbox.com/login", data=auth_data)
		self.cookie = dict(resp.cookies)
		print self.username
		logging.info("cookie received for advertiser  username: %s" % self.username)
		logging.info("cookie is %s" % self.cookie)

	def get_segments(self):
		url = "http://crusher.getrockerbox.com/crusher/funnel/action?format=json"
		results = requests.get(url,cookies=self.cookie)
		raw_results = results.json()['response']
		segments = []
		for result in raw_results:
			single_seg = [result['url_pattern'], result['action_name'], result['action_id']]
			segments.append(single_seg)
		logging.info("returned %s segments for advertiser %s" % (len(segments), self.username))
		return segments

	def make_request(self, url_pattern, advertiser, action_name, action_id):
		logging.info("calling segment %s" % url_pattern[0])
		url = "http://crusher.getrockerbox.com/crusher/pattern_search/timeseries?search=%s&num_days=2" % url_pattern[0]
		import ipdb;ipdb.set_trace()
		results = requests.get(url, cookies=self.cookie)
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
		return df


	def insert(self, frame, table_name, columns, con, keys):
                batch_num = int(len(frame) / 50)+1
                for batch in range(0, batch_num):
			if batch==0:
                        	to_insert = frame.ix[0:50]
			else:
				to_insert = frame.ix[batch*50+1:(batch+1)*50]	
			if len(to_insert)>0:
				_sql._write_mysql(to_insert, table_name, columns, con, keys)
				logging.info("inserted %s records for advertiser %s" % (len(to_insert), self.username))

	def seg_loop(self, segments, advertiser):
		for seg in segments:
			res = self.make_request(seg[0],advertiser,seg[1], seg[2])
			self.insert(res, "action_dashboard_cache", list(res.columns), segs.con, ['advertiser', 'action_id', 'domain'])
	


def get_all_advertisers():
	c = lnk.dbs.rockerbox
	ad_df = c.select_dataframe("select pixel_source_name from advertiser where active=1 and deleted=0 and running=1")
	advertiser_list = []
	for index, ad in ad_df.iterrows():
		print ad[0]
		username = "a_%s" % str(ad[0])
		password = "admin"
		advertiser_list.append([username,password])
	return advertiser_list
	
advertiser_list = get_all_advertisers()

for advert in advertiser_list:
	segs = seg_cache(advert[0], advert[1])
	segs.auth()
	s=segs.get_segments()
	segs.seg_loop(s, advert[0])



