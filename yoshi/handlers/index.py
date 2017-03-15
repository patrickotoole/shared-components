import tornado.web
import logging
import json
from link import lnk
import bs4
import pandas as pd
import requests
import random
from lib.pandas_sql import s
import logging
import MySQLdb

YOSHI_SETUP = '''
SELECT * FROM rockerbox.yoshi_setup
WHERE external_advertiser_id = %s
AND active = 1
'''
    
DOMAIN_SOURCE = '''
SELECT domain, source, subsource, weight
FROM rockerbox.dora_domains_source
WHERE external_advertiser_id = %(external_advertiser_id)s AND 
source = "%(source)s" AND subsource = "%(subsource)s"
AND domain NOT IN
(
    SELECT domain FROM rockerbox.yoshi_domain_queue 
    WHERE external_advertiser_id = %(external_advertiser_id)s 
    AND line_item_name = "%(line_item_name)s"
    AND last_ran is not NULL
)
ORDER BY weight DESC
LIMIT %(num_domains)s
'''

DOMAIN_LINKS = '''
SELECT * 
FROM rockerbox.yoshi_domain_links
WHERE domain IN %s'''

class DataLoader(object):

    def __init__(self, db):
        self.db = db

    def insert_df(self,df,table,key=[],columns=[]):

        con = self.db.create_connection()
        df = df[columns]
        BATCH_SIZE = 50
        LAST = int(len(df) / BATCH_SIZE) + 1
        current = 1
        logging.info("Records to insert: %s" % len(df))
        while current <= LAST:
            logging.info("Inserting: %s to %s" % ((current - 1)*BATCH_SIZE,current*BATCH_SIZE))
            _df = df.ix[(current - 1)*BATCH_SIZE:current*BATCH_SIZE]
            s.write_frame(_df,table,con,flavor='mysql',if_exists='update',key=key)
            current += 1

        return df

SETUP = '''
SELECT source, subsource, num_domains
FROM rockerbox.yoshi_setup
WHERE external_advertiser_id = %s
'''


class SetupHandler(tornado.web.RequestHandler):

    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False) 
    

    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        df = self.db.select_dataframe(SETUP%advertiser_id)
        j = json.dumps(df.to_dict("records"))
        self.write(j)
        self.finish()

    def post(self):
        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body).get('data')

        for x in data:
            x['external_advertiser_id'] = advertiser_id
        data = pd.DataFrame(data)

        dl = DataLoader(self.db)
        dl.insert_df(data, "yoshi_setup",[], ['external_advertiser_id', 'source', 'subsource', 'num_domains', 'active','line_item_name'])
        self.get()



class DomainsHandler(tornado.web.RequestHandler):
    
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)

    def get(self):
        advertiser_id = self.get_query_argument("advertiser")
        df = self.db.select_dataframe(YOSHI_SETUP%advertiser_id)
        
        queue = pd.DataFrame()
        
        for k, row in df.iterrows():
            domains = self.db.select_dataframe(DOMAIN_SOURCE%row.to_dict())
            domains["line_item_name"] = row['line_item_name']
            queue = pd.concat([queue, domains])

        self.write(json.dumps(queue.to_dict('records')))
        self.finish()
    
    def post(self):

        advertiser_id = self.get_query_argument("advertiser")
        data = json.loads(self.request.body).get('data')
        data = pd.DataFrame(data)

        data['external_advertiser_id'] = advertiser_id
    
        dl = DataLoader(self.db)
        dl.insert_df(data, "yoshi_domain_queue",[], ["external_advertiser_id","line_item_id","domain","num_sublinks","num_tags","last_ran", "created_at"])

class URLHandler(tornado.web.RequestHandler):
    
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
    
    def get(self):
        domains = self.get_query_argument("domains")
        domains = domains.split(",")
        domains = [str(d) for d in domains]
        domains = str(domains).replace("[","(").replace("]",")")
        df = self.db.select_dataframe(DOMAIN_LINKS%domains)
        
        self.write(json.dumps(df[['domain','url']].to_dict('records')))
        self.finish()
            
    def post(self):

        data = json.loads(self.request.body).get('data')
        data = pd.DataFrame(data)

        data = pd.DataFrame(data)        
        data['url'] = data['url'].apply(lambda x: MySQLdb.escape_string(x.decode('utf-8').encode('utf-8')))
        
        dl = DataLoader(self.db)
        dl.insert_df(data, "yoshi_domain_links",[], ["domain","url"])
