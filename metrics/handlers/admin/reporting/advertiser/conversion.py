import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import CONVERSION_QUERY
from ..base import AdminReportingBaseHandler

"""
select *
from pixel_data 
where date >= "14-09-11" and date <= "14-09-15" and source="shutterstock" and type="conv" and segment like "%25496734%";
"""

class ConversionCheckHandler(AdminReportingBaseHandler):

    QUERY = CONVERSION_QUERY
    GROUPS = {}
    FIELDS = {
        "uid":"uid",
        "source":"source",
        "segemnt":"semgent",
        "referrer":"referrer",
        "user_agent":"user_agent"
    }
    WHERE = {
        "source": "source like '%%%(source)s%%'",
        "segment": "segment like '%%%(segment)s%%'"
    }
    OPTIONS = {
        "default": {
            "meta": {
                "groups": [],
                "fields": ["source","uid", "segment", "referrer", "user_agent"],
                "formatters":{
                    "uid":"none"
                }

            }
        }
    }


    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)


    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "set shark.map.tasks=44", 
            "set mapred.reduce.tasks=0",
            query
        ]

        raw = yield run_hive_session_deferred(self.hive,query_list)
        df = pandas.DataFrame(raw)
        print df['source']
        self.get_content(df)

    def get_meta_group(self,default="default"):
        
        domain_list = self.get_argument("type",False)
        advertiser = self.get_argument("advertiser",False)

        if domain_list:
            return "type"

        if advertiser:
            return "advertiser"
        
        return default

    

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include",False)
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)

        if meta:
            meta_data['groups'] = meta_data["fields"]
            meta_data['fields'] = []
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where()
            )
            print params
            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())

 
