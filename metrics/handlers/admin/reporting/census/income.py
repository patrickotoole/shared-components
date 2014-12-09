import pandas
import tornado.web
import ujson
import numpy as np

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import CENSUS_INCOME_QUERY
from ..base import AdminReportingBaseHandler


JOIN = {
    "ref": "JOIN (SELECT zip_code, split(max(concat(city, ',', state)),',')[1] as state, split(max(concat(city, ',', state)),',')[0] as city FROM zip_code_ref GROUP BY zip_code) b on a.zip_code = b.zip_code"
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["zip_code", "city", "state"],
            "fields": ["population", "median_household_income"],
            "formatters": {
                "zip_code": "none"
                }
            }
        },

    "none": {
        "meta": {
            "groups": [],
            "fields": ["population", "median_household_income"]
            }
        }
}

GROUPS = {
    "zip_code": "zip_code",
    "city": "city",
    "state": "state"
    }


FIELDS = {
    "population": "sum(population)",
    "median_household_income": "avg(median_household_income)"
    }

WHERE = {    
    "zip_code": "zip_code = '%(zip_code)s'",
    "city": "lower(city) like lower('%(city)s')",
    "state": "CASE WHEN length('%(state)s') != 2 THEN (lower(state) like lower('%(state)s')) ELSE (lower(state_abbr) like lower('%(state)s')) END",
    "min_population": "population >= %(min_population)s",
    "max_population": "population <= %(max_population)s",
    "min_income": "median_household_income >= %(min_income)s",
    "max_income": "median_household_income <= %(max_income)s"
    }

class IncomeCensusHandler(AdminReportingBaseHandler):

    QUERY = CENSUS_INCOME_QUERY
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
        raw = yield run_hive_session_deferred(self.hive,query_list)

        formatted = self.format_data(
            pandas.DataFrame(raw),
            groupby,
            wide
        )

        self.get_content(formatted)

    def format_data(self, u, groupby, wide):
        for field in FIELDS:
            if field in u.columns and field != "population":
                try:
                    try:
                        u[field] = u[field].astype(int)
                    except:
                        u[field] = u[field].astype(float) 
                except:
                    logging.warn("Could not format %s" % field)
                    pass

        if "median_household_income" in u.columns.tolist():
            u.sort("median_household_income", ascending=False)
            u = u.head(1000)
        elif "population" in u.columns.tolist():
            u.sort("population", ascending=False)
            u = u.head(1000)

        if groupby and wide:
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        return u
        
    def get_meta_group(self,default="default"):
        meta = self.get_argument("meta", False)

        if meta:
            return meta

        return default

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)

        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(date=False),
                self.make_join(meta_data.get("static_joins",""))
            )

            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())
