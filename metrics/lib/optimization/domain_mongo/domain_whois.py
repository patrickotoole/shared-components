import pandas as pd
import numpy
import requests
import time
import json
from link import lnk
console  = lnk.api.console

import logging
logger = logging.getLogger("opt")



'''
Domain Meta Table
'''

## 1) Load domains
## 2) Check for domains already containing registered geo field, and remove
## 3) Iterate through filtered domain list, extract whois data
## 4) Push to table

def get_whois(domain):
    API_KEY = 'edeeecc7c9b177dad7c9412ef9a60b45'
    url = 'http://api.whoapi.com/?domain=%s&r=whois&apikey=%s'
    r = requests.get(url%(domain,API_KEY))
    return r.json()


def extract_whois_contacts(whois_json):
    if isinstance(whois_json, dict):
        if 'contacts' in whois_json.keys():
            if whois_json['contacts'] is not None:
                return whois_json['contacts']
    return 0


class DomainWhois():

    def __init__(self, start_date, end_date):

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

        self.domain_list = list(df_domains['domain'])[:2000]
        print "Loaded %d domains" %len(self.domain_list)


    def check_whois_field_exists(self, domain_data):

        if len(domain_data) > 0:
            if self.whois_col in domain_data[0].keys():
                if (domain_data[0][self.whois_col] != 0) or (domain_data[0][self.whois_col] != {}):
                    return True
        return False

    def domain_exists(self, domain_data):
        return len(domain_data) > 0

    def pull_domain_data(self, domain):

        url = "http://portal.getrockerbox.com/domains?format=json&domain=%s"
        r = requests.get(url%domain)
        try:
            return r.json()
        except ValueError as e:
            logger.error("Error %s in getting mongo db data for domain %s" %(e, domain))
            logger.info(r.text)

    def check_data(self):

        data = []
        for i,domain in enumerate(self.domain_list):
            row = {}
            row['domain'] = domain
            domain_data = self.pull_domain_data(domain)
            row['domain_exists'] = self.domain_exists(domain_data)
            row['whois_exists'] = self.check_whois_field_exists(domain_data)
            data.append(row)

            if (i % 100) == 0:
                logger.info("On domain %d" %i)
        self.data = pd.DataFrame(data)

    def filter_domains(self):
        logger.info("Starting with %d domains" %len(self.domain_list))
        self.check_data()
        self.data = self.data[self.data['whois_exists'] != 1]

        self.data  = self.data.iloc[0:1000]
        logger.info("Filtered to %d domains" %len(list(self.data['domain'])))


    def push_whois(self):

        for k in range(len(self.data)):

            row = self.data.iloc[k]
            domain = row['domain']

            logger.info("Extracting whois for %s" %domain)
            domain_data = {}
            domain_data['domain'] = domain
            whois_json = get_whois(domain)
            domain_data[self.whois_col] = extract_whois_contacts(whois_json)

            if row['domain_exists']:
                self.update(domain_data)
            else:
                self.insert(domain_data)

            time.sleep(2)

    def insert(self, domain_data):
        logger.info("Inserting %s to domains table" %domain_data['domain'])
        r = requests.post("http://portal.getrockerbox.com/domains", data=json.dumps(domain_data))
        logger.info(r.text)

    def update(self, domain_data):
        logger.info("Updating %s in domains table"%domain_data['domain'])
        to_update = {}
        to_update[self.whois_col] = domain_data[self.whois_col]
        r = requests.put("http://portal.getrockerbox.com/domains?domain=%s"%domain_data['domain'], 
            data=json.dumps(to_update))
        logger.info(r.text)




    # def add_whois(self):

    #   whois_column = [None] * len(self.data)
    #   for k in range(len(self.data)):
    #       domain = self.data['domain'].iloc[k]
    #       print "Extracting whois for %s" %domain
    #       domain_data = {}
    #       domain_data['domain'] = domain
    #       whois_json = get_whois(domain)
    #       whois_column[k] = extract_whois_contacts(whois_json)
    #       time.sleep(2)
    #   self.data[self.whois_col] = whois_column


    # def push_data(self):

    #   for k in range(len(self.data)):
    #       row = self.data.iloc[k]
    #       if row['domain_exists']:
    #           self.update(row)
    #       else:
    #           self.insert(row)





