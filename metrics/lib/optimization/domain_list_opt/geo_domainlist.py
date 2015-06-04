import pandas as pd
import requests
import time
import json
from link import lnk
# h = lnk.dbs.hive
import logging
import copy
from link import lnk
console  = lnk.api.console



def extract_admin_field(whois_contacts, contact_type, field):

	if whois_contacts == None:
		return None

	else:
		contact = filter(lambda contact: contact['type'] == contact_type, whois_contacts)
		if len(contact) == 0:
			return None
		else:
			return contact[0][field]

def get_domain_list(id):
	r = console.get("/domain-list?id=%s"%id)
	return r.json['response']['domain-list']['domains']


class DomainWhoisGeo():

	def __init__(self, list_id):
		self.list_id = list_id
		self.data = None
		self.good_countries = ['United States']
		self.rbox_api = lnk.api.rockerbox


	def load_data(self):
		r = requests.get("http://portal.getrockerbox.com/domains?format=json")
		self.data = pd.DataFrame(r.json())
		#print len(self.data)

	def country_filter(self, country):
		return (country not in self.good_countries)

	def filter(self):
		self.data = self.data[self.data['whois_contacts'] != 0]
		self.data['admin_country'] = self.data['whois_contacts'].apply(lambda x: extract_admin_field(x, 'admin','country'))
		self.data['registrant_country'] = self.data['whois_contacts'].apply(lambda x: extract_admin_field(x, 'registrant','country'))
		self.data = self.data[self.data['registrant_country'].apply(lambda x: self.country_filter(x))]


	def push(self):

		old_domain_list = get_domain_list(self.list_id)
		new_domain_list = copy.copy(old_domain_list)

		## Adding domains that aren't already in the list
		for domain in self.data['domain'].unique():
			if domain not in old_domain_list:
				new_domain_list.append(domain)


		log = {
				"rule_group_id": 6,
				"field_old_value": old_domain_list,
				"field_new_value": new_domain_list,
				"domain_list_id": self.list_id,
				"object_modified": "domain_list",
				"field_name": "domains",
				"metric_values": {}

				}

		r = self.rbox_api.post("/opt_log", data=json.dumps(log))
		print r.json
