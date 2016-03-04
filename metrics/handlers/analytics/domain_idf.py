import tornado.web
import ujson
import pandas
import StringIO
from twisted.internet import defer

from ..base import BaseHandler
from lib.helpers import *

QUERY = "select p.*, c.parent_category_name from reporting.pop_domain_with_category p join category c using (category_name) where domain in (%(domains)s)"



def make_run_query(err_msg):
    def run_query(fn):
        
        def run(self,*args):
            db, q, params = fn(self,*args)
            df = db.select_dataframe(q % params)
            if df.empty:
                raise Exception(err_msg % params)
            return df

        return run
    return run_query
        

class DomainIDFDB(object):
    """
    Interacts with the database to pull reporting data
    """

    ERR_MSG = "Issue with "

    def initialize(self, db, hive, spark_sql=None):
        self.db = db 

    @make_run_query(ERR_MSG + "domains: %(domains)s ")
    def get_domains(self,domains):
        params = {"domains": "'" + "','".join(domains) + "'"}
        return (self.db, QUERY, params)

    @decorators.deferred
    def deferred_get_domains(self,domains):
        df = self.get_domains(domains)
        return df


        

class DomainIDFHandler(BaseHandler,DomainIDFDB):

    def initialize(self, db=None, api=None, hive=None, spark_sql=None,reporting=None, **kwargs):
        self.db = db

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            json = Convert.df_to_json(data)
            self.write(json)
            self.finish()

        yield default, (data,)
 

    @defer.inlineCallbacks 
    def get_data(self,domains):

        try:
            data = yield self.deferred_get_domains( map(lambda x: x.encode("utf-8"), domains) )
        except:
            data = pandas.DataFrame([])

        self.get_content(data)  

    @tornado.web.authenticated
    @tornado.web.asynchronous  
    def get(self):

        domains = self.get_argument("domains", "")

        self.get_data(domains.split(","))

    @tornado.web.authenticated
    @tornado.web.asynchronous  
    def post(self):

        domains = ujson.loads(self.request.body)['domains']
        self.get_data(domains)
