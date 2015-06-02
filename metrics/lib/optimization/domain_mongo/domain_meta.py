import pandas as pd
import requests
import time
import json
from link import lnk
# h = lnk.dbs.hive
import logging

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

def extract_whois_field(whois_json, field_name):

	if 'contacts' in whois_json.keys() and len(whois_json['contacts']) > 0:
		N = len(whois_json['contacts'])
		return whois_json['contacts'][N-1][field_name]
	else:
		return None


class DomainWhois():

	def __init__(self, start_date, end_date, fields):

		self.hive = lnk.dbs.hive
		#self.logger = logging.getLogger("opt")
		self.start_date = start_date
		self.end_date = end_date	
		self.fields = fields
		
		self.domain_list = None
		self.data = None

	def load_domains(self):
		query = '''
		SELECT DISTINCT domain
		FROM advertiser_visibility_daily
		WHERE date >= "{}" AND date <= "{}" AND domain != "" 
		'''.format(self.start_date, self.end_date)
		df_domains = pd.DataFrame(self.hive.execute(query))
		self.domain_list = list(df_domains['domain'])[:5]
		print "Loaded %d domains" %len(self.domain_list)


	def pull_domain_data(self, domain):

		url = "http://portal.getrockerbox.com/domains?format=json&domain=%s"
		r = requests.get(url%domain)
		return r.json()

	def check_field_exists(self, domain_data):

		if len(domain_data) == 0:
			return False
		elif any(field not in domain_data[0].keys() for field in self.fields):
			return False
		elif any(domain_data[0][field] == 0 for field in self.fields):
			return False
		else:
			return True


	def filter_domains(self):
		filtered = []
		for domain in self.domain_list:
			domain_data = self.pull_domain_data(domain)
			if self.check_field_exists(domain_data):
				print "Data already exists for %s" %domain
			else:
				filtered.append(domain)
		self.domain_list =  filtered


	def extract_whois(self):

		df = []

		for domain in self.domain_list:

			print "Extracting whois for %s" %domain
			domain_data = {}
			domain_data['domain'] = domain
			whois_json = get_whois(domain)
			for field_name in self.fields:		
				domain_data[field_name] = extract_whois_field(whois_json, field_name)
			
			df.append(domain_data)
			time.sleep(90)
		
		self.data = pd.DataFrame(df)


	def insert(self):
		for k in range(len(self.data)):
			domain_data = self.data.iloc[k].to_dict()
			print "Adding %s to domains table" %domain_data['domain']
			r = requests.post("http://portal.getrockerbox.com/domains", 
				data=json.dumps(domain_data))
			print r.text







