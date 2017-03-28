import tornado.web
import json
import pandas as pd
import logging
from database import *


class URLHandler(tornado.web.RequestHandler, UrlDatabase):
    
    def initialize(self, **kwargs):
        self.db = kwargs.get("db",False)
    
    def get(self):
        domains = self.get_query_argument("domains")
        df = self.get_domain_links(domains)        
        self.write(json.dumps(df[['domain','url']].to_dict('records')))
        self.finish()
            
    def post(self):
        data = json.loads(self.request.body).get('data')
        self.insert_domain_links(data)
