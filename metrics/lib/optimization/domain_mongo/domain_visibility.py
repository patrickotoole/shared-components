import pandas as pd
import numpy
import requests
import time
import json
from link import lnk
import pprint
import logging
logger = logging.getLogger("opt")


HIVE_QUERY = '''
SELECT domain, SUM(num_served) as num_served, SUM(num_loaded) as num_loaded, SUM(num_visible) as num_visible
FROM
(
    SELECT num_served, num_loaded, num_visible, domain
    FROM advertiser_visibility_daily
    WHERE date >= "{}" AND date <= "{}" AND domain != ""
)a
GROUP By domain
'''

def pull_domain_data(domain):
    url = "http://portal.getrockerbox.com/domains?format=json&domain=%s"
    r = requests.get(url%domain)
    try:
        return r.json()
    except ValueError as e:
        logger.error("Error %s in getting mongo db data for domain %s" %(e, domain))
        logger.info(r.text)

def pull_all_domain_data():
    url = "http://portal.getrockerbox.com/domains?format=json"
    r = requests.get(url)
    df = pd.DataFrame(r.json())
    return df


class DomainVis():

    def __init__(self, start_date, end_date, overwrite = False):

        self.start_date = start_date
        self.end_date = end_date
        self.overwrite = overwrite

        self.imps_served_cutoff = 650
        self.imps_loaded_cutoff = 650

        self.data = None
        self.hive = lnk.dbs.hive

    def load_domains(self):
        query = HIVE_QUERY.format(self.start_date, self.end_date)
        self.data = pd.DataFrame(self.hive.execute(query))

        if self.data is None or len(self.data) == 0:
            logger.error("No data loaded")
            raise AttributeError("No data loaded")
        else:
            logger.info("Loaded %d domains" %len(self.data))
            self.data['loaded_ratio'] = self.data['num_loaded'] / self.data['num_served']
            self.data['visible_ratio'] = self.data['num_visible'] / self.data['num_loaded']
            self.data = self.data.fillna(0) 
            self.data = self.data.sort('num_loaded', ascending = False)
            # self.data = self.data.iloc[:10]


    def domain_exists(self, domain_data):
        
        return (len(domain_data) > 0)
    
    # def domain_field_exists(self, domain_data, field):

    #     if len(domain_data) > 0:
    #         if field in domain_data[0].keys():
    #             return True
    #     return False


    def check_domains(self):

        all_domain_data = pull_all_domain_data()
        self.data['domain_exists'] = self.data['domain'].apply(lambda x: x in all_domain_data['domain'].unique())


    def filter_domains(self):

        self.data = self.data[(self.data['num_loaded'] >= self.imps_loaded_cutoff)]
        self.check_domains()

    def push(self):

        for k in range(len(self.data)):
            row = self.data.iloc[k]

            if not row['domain_exists']:
                self.insert(row)

            elif row['domain_exists'] and self.overwrite:
                self.update(row)


    def update(self, row):

        to_update = {'visible_ratio': row['visible_ratio'],
                    'loaded_ratio': row['loaded_ratio']}

        logger.info("Updating %s in domains table" %row['domain'])
        logger.info("\n" + pprint.pformat(to_update))

        r = requests.put("http://portal.getrockerbox.com/domains?domain=%s"% row['domain'], 
            data=json.dumps(to_update))
        logger.info(r.text)


    def insert(self, domain, field_name, field_value):

        to_update = {'domain': row['domain'],
                    'visible_ratio': row['visible_ratio'],
                    'loaded_ratio': row['loaded_ratio']}
  
        logger.info("Inserting %s to domains table" %domain)
        logger.info("\n" + pprint.pformat(to_insert))
        r = requests.post("http://portal.getrockerbox.com/domains", data=json.dumps(to_insert))
        logger.info(r.text)




