import pandas
import tornado.web
import ujson
import numpy as np

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred
from lib.query.HIVE import CENSUS_AGE_GENDER_QUERY
from ..base import AdminReportingBaseHandler

EXAMPLE = '''
select 
    zip_code, 
    min(min_age) as min_age, 
    max(max_age) as max_age, 
    sum(number) as number, 
    sum(percent) as percent, 
    max(CASE WHEN number = 0 THEN 0.0 ELSE (number*100.0) / percent END > 1000.0) as population 
FROM census_age_gender 
WHERE gender="both" and min_age>=18 and max_age<=29 and CASE WHEN number = 0 THEN 0.0 ELSE (number*100.0) / percent END > 1000.0 
GROUP BY zip_code 
ORDER BY perc desc limit 25;
'''

JOIN = {
    "ref": "JOIN (SELECT zip_code, split(max(concat(city, ',', state)),',')[1] as state, split(max(concat(city, ',', state)),',')[0] as city FROM zip_code_ref GROUP BY zip_code) b on a.zip_code = b.zip_code"
}

CONFIG = {
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["zip_code", "city", "state"],
            "fields": ["population"],
            "static_joins": JOIN["ref"],
            "formatters": {
                "zip_code": "none"
                }
            }
        },

    "search" : {
        "meta": {
            "groups": ["zip_code", "city", "state", "gender"],
            "fields": ["min_age", "max_age", "percent", "number", "population"],
            "static_joins": JOIN["ref"],
            "formatters": {
                "zip_code": "none"
                }
            }
        },

    "zip_code": {
        "meta": {
            "groups": ["zip_code", "city", "state", "gender", "min_age", "max_age"],
            "fields": ["number", "percent"],
            "static_joins": JOIN["ref"]
            }
        },

    "none": {
        "meta": {
            "groups": [],
            "fields": ["number", "percent"],
            "static_joins": JOIN["ref"]
            }
        }
}

GROUPS = {
    "zip_code": "a.zip_code",
    "city": "b.city",
    "state": "b.state",
    "gender": "gender",
    "min_age": "min_age",
    "max_age": "max_age"
    }


FIELDS = {
    "min_age": "min(min_age)",
    "max_age": "max(max_age)",
    "number": "sum(number)",
    "percent": "ROUND(sum(percent), 2)",
    "avg_percent": "ROUND(avg(percent), 2)",
    "population": "CAST(ROUND(min(CASE WHEN number = 0 THEN 0.0 ELSE (number*100.0) / percent END)) AS BIGINT)"
    }

WHERE = {    
    "zip_code": "a.zip_code = '%(zip_code)s'",
    "city": "lower(b.city) like lower('%(city)s')",
    "state": "lower(b.state) like lower('%(state)s')",
    "gender": "gender = lower('%(gender)s')",
    "min_age": "min_age >= %(min_age)s",
    "max_age": "max_age <= %(max_age)s",
    "race_threshold": "",
    "gender_threshold":"",
    "min_population": "CASE WHEN number = 0 THEN 0.0 ELSE (number*100.0) / percent END > %(min_population)s"
    }

class AgeGenderCensusHandler(AdminReportingBaseHandler):

    QUERY = CENSUS_AGE_GENDER_QUERY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    CONFIG = CONFIG

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

        if "percent" in u.columns.tolist():
            u.sort("percent", ascending=False)
            u = u.head(1000)
        elif "number" in u.columns.tolist():
            u.sort("number", ascending=False)
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
        zip_code = self.get_argument("zip_code", False)
        min_age = self.get_argument("min_age", False)
        max_age = self.get_argument("max_age", False)
        gender = self.get_argument("gender", False)
        city = self.get_argument("city", False)
        state = self.get_argument("state", False)

        if meta:
            return meta

        if zip_code or city or state:
            return "zip_code"

        if gender or min_age or max_age:
            return "search"

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
