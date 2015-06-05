import pandas as pd
import numpy
import requests
import time
import json
from link import lnk
import pprint
console  = lnk.api.console
import tldextract
import logging
logger = logging.getLogger("opt")


'''
Domain Meta Table
'''

## 1) Load domains
## 2) Check for domains already containing registered geo field, and remove
## 3) Iterate through filtered domain list, extract whois data
## 4) Push to table

def extract_whois_raw(whois_json):
    if isinstance(whois_json, dict):
        if 'whois_raw' in whois_json.keys():
            return whois_json['whois_raw']
    return 0


def get_whois(domain):
    API_KEY = 'edeeecc7c9b177dad7c9412ef9a60b45'
    url = 'http://api.whoapi.com/?domain=%s&r=whois&apikey=%s'
    r = requests.get(url%(domain,API_KEY))
    return r.json()


def check_whois_limit(whois_json):
    if 'LIMIT EXCEEDED' in whois_json['whois_raw']:
        return True

def extract_sld(domain):
    extracted = tldextract.extract(domain)
    sld_tld = extracted[1] + "." + extracted[2]
    return sld_tld
        

class DomainWhois():

    def __init__(self, start_date, end_date, start_hour, end_hour):

        self.hive = lnk.dbs.hive
        self.start_date = start_date
        self.end_date = end_date
        self.start_hour = start_hour
        self.end_hour = end_hour

        self.whois_col = 'whois_raw'
        self.domain_list = None
        self.data = None

    def load_domains(self):
        query = '''
        SELECT DISTINCT domain
        FROM advertiser_visibility_daily
        WHERE date >= "{}" AND date <= "{}" 
        AND hour >= "{}" AND hour <= "{}" 
        AND domain != "" 
        '''.format(self.start_date, self.end_date, self.start_hour, self.end_hour)
        
        logger.info(query)
        df_domains = pd.DataFrame(self.hive.execute(query))

        if df_domains is None or len(df_domains) == 0:
            logger.error("No data loaded")
            raise AttributeError("No data loaded")
        else:
            logger.info("Loaded %d domains" %len(df_domains))

        self.domain_list = list(df_domains['domain'].iloc[:2000])

    def clean_domains(self):

        cleaned_list = []
        for domain in self.domain_list:
            cleaned_domain = extract_sld(domain)
            logger.info("cleaned %s to %s" %(domain, cleaned_domain))
            cleaned_list.append(cleaned_domain)
        self.domain_list = cleaned_list


    def check_whois_field_exists(self, domain_data):

        if len(domain_data) > 0:
            if self.whois_col in domain_data[0].keys():
                if (domain_data[0][self.whois_col] != 0):
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
        self.data = self.data[self.data['whois_exists'] != True]

        self.data  = self.data.iloc[:1000]
        logger.info("Filtered to %d domains" %len(list(self.data['domain'])))


    def push_whois(self):

        for k in range(len(self.data)):

            row = self.data.iloc[k]
            domain = row['domain']
            logger.info("Extracting whois for %s" %domain)
            domain_data = {}
            domain_data['domain'] = domain

            ## Extracting whois data
            whois_json = get_whois(domain)

            ## Check status of api pull
            if whois_json['status'] == "0":
                domain_data[self.whois_col] = extract_whois_raw(whois_json)

                ## Push whois data to table if pull is correct
                if row['domain_exists']:
                    self.update(domain_data)
                else:
                    self.insert(domain_data)
            
            ## Logging out errors
            else:
                logger.error('whois call failed for %s with status %s' %(domain, whois_json['status']))
                domain_data[self.whois_col] = 0
            
            time.sleep(8)
            

    def insert(self, domain_data):
        logger.info("Inserting %s to domains table" %domain_data['domain'])
        logger.info("\n" + pprint.pformat(domain_data))
        r = requests.post("http://portal.getrockerbox.com/domains", data=json.dumps(domain_data))
        logger.info(r.text)

    def update(self, domain_data):
        logger.info("Updating %s in domains table"%domain_data['domain'])
        to_update = {}
        to_update[self.whois_col] = domain_data[self.whois_col]
        logger.info("\n" + pprint.pformat(to_update))
        r = requests.put("http://portal.getrockerbox.com/domains?domain=%s"%domain_data['domain'], 
            data=json.dumps(to_update))
        logger.info(r.text)

