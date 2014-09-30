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


OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser", "attributed_to", "segment"],
            "fields": ["num_conv"],
            }
        },

    "advertiser": {
        "meta": {
            "groups": [""],
            "fields": [""]
            }
        },
    
    "segment": {
        "meta": {
            "groups": [],
            "fields": []
            }
        },
    
    "uid": {
        "meta": {
            "groups": [],
            "fields": []
            }
        }
    }

GROUPS = {
    "advertiser": "advertiser",
    "segment": "segment",
    "attributed_to": "CASE WHEN num_served > 0 THEN 'Rockerbox' ELSE 'Other' END"
    }

FIELDS = {
    "num_conv" : "count(*)"
    }

WHERE = {
    "attributed_to": "CASE WHEN %(attributed_to)s LIKE 'Rockerbox' THEN num_served > 0 ELSE num_served < 0",
    "advertiser": "advertiser like '%%%(advertiser)s%%'",
    "uid": "uid = '%(uid)s'",
    "segment": "segment like '%%%(segment)s%%'"
    }

class ConversionCheckHandler(AdminReportingBaseHandler):

    QUERY = CONVERSION_QUERY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, db=None, api=None, hive=None):
        self.db = db 
        self.api = api
        self.hive = hive

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "set shark.map.tasks=12", 
            "set mapred.reduce.tasks=0",
            query
        ]
        print query
        raw = yield run_hive_session_deferred(self.hive,query_list)
        print raw

        formatted = self.format_data(
            pandas.DataFrame(raw),
            groupby,
            wide
        )

        print formatted
        self.get_content(formatted)

    def format_data(self, u, groupby, wide):
        for field in FIELDS:
            if field in u.columns:
                try:
                    try:
                        u[field] = u[field].astype(int)
                    except:
                        u[field] = u[field].astype(float) 
                except:
                    logging.warn("Could not format %s" % field)
                    pass

        if groupby and wide:
            print "Here"
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        return u

        
    def get_meta_group(self,default="default"):
        advertiser = self.get_argument("advertiser",False)
        uid = self.get_argument("uid", False)
        segment = self.get_argument("segment", False)

        if uid:
            return "uid"
        elif segment:
            return "segment"
        elif advertiser:
            return advertiser
        else:
            return default

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include",False)
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where()
            )
            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())

 
