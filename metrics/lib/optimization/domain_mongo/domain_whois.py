import pandas as pd
import requests
import time
import json
from link import lnk
console  = lnk.api.console

'''
Domain Meta Table
'''

## 1) Load domains
## 2) Check for domains already containing registered geo field, and remove
## 3) Iterate through filtered domain list, extract whois data
## 4) Push to table

def get_whois(domain):
	API_KEY = '1779c3d09740eed52c48c1abe4830457'
	url = 'http://api.whoapi.com/?domain=%s&r=whois&apikey=%s'
	r = requests.get(url%(domain,API_KEY))
	return r.json()


def extract_whois_contacts(whois_json):

	if 'contacts' in whois_json.keys() and len(whois_json['contacts']) > 0:
		return whois_json['contacts']
	else:
		return None


class DomainWhois():

	def __init__(self, start_date, end_date, fields):

		self.hive = lnk.dbs.hive
		self.start_date = start_date
		self.end_date = end_date	
		
		self.whois_col = 'whois_contacts'
		self.domain_list = None
		self.data = None

	def load_domains(self):
		query = '''
		SELECT DISTINCT domain
		FROM advertiser_visibility_daily
		WHERE date >= "{}" AND date <= "{}" AND domain != "" 
		'''.format(self.start_date, self.end_date)
		df_domains = pd.DataFrame(self.hive.execute(query))

		self.domain_list = list(df_domains['domain'])[:2]
		print "Loaded %d domains" %len(self.domain_list)


	def check_whois_field_exists(self, domain_data):

		if len(domain_data) > 0:
			if self.whois_col in domain_data[0].keys():
				if domain_data[0][self.whois_col] != 0:
					return True
		return False

	def domain_exists(self, domain_data):
		return len(domain_data) > 0

	def pull_domain_data(self, domain):

		url = "http://portal.getrockerbox.com/domains?format=json&domain=%s"
		r = requests.get(url%domain)
		return r.json()

	def check_data(self):

		data = []
		for domain in self.domain_list:
			row = {}
			row['domain'] = domain
			domain_data = self.pull_domain_data(domain)
			row['domain_exists'] = self.domain_exists(domain_data)
			row['whois_exists'] = self.check_whois_field_exists(domain_data)
			data.append(row)
		self.data = pd.DataFrame(data)

	def filter_domains(self):
		print "Starting with ", self.domain_list
		self.check_data()
		self.data = self.data[self.data['whois_exists'] != True]
		print "Filtered domains to ", list(self.data['domain'])

	def add_whois(self):

		whois_column = [None] * len(self.data)
		for k in range(len(self.data)):
			domain = self.data['domain'].iloc[k]
			print "Extracting whois for %s" %domain
			domain_data = {}
			domain_data['domain'] = domain
			whois_json = get_whois(domain)
			whois_column[k] = extract_whois_contacts(whois_json)
			time.sleep(90)
		self.data[self.whois_col] = whois_column
		import ipdb
		ipdb.set_trace()

	def push_data(self):

		for k in range(len(self.data)):
			row = self.data.iloc[k]
			if row['domain_exists']:
				self.update(row)
			else:
				self.insert(row)

	def insert(self, row):

		print "Inserting %s to domains table" %row['domain']
		r = requests.post("http://portal.getrockerbox.com/domains", data=json.dumps(row))
		print r.text

	def update(self, row):

		print "Updating %s in domains table"%row['domain']
		to_update = {}
		to_update[self.whois_col] = row[self.whois_col]
		r = requests.put("http://portal.getrockerbox.com/domains?domain=%s"%row['domain'], 
			data=json.dumps(to_update))
		print r.text





