import tornado.web
import ujson
import pandas
import datetime

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_hive_session_deferred, run_hive_deferred, run_spark_sql_session_deferred
from lib.query.HIVE import SERVED_GEO, CENSUS_SERVED_GEO
import lib.query.helpers as query_helpers
from ..base import AdminReportingBaseHandler

JOIN = {
    "census_income": "v JOIN (SELECT * FROM zip_code_ref WHERE median_household_income IS NOT NULL and zip_code IS NOT NULL) b ON (v.zip_code = b.zip_code)",
    "census_age_gender": "v RIGHT OUTER JOIN (SELECT zip_code, gender, max_age, min_age, number, percent FROM census_age_gender GROUP BY zip_code, gender, min_age, max_age, number, percent) b ON (v.zip_code = b.zip_code)",
    "census_race": " v RIGHT OUTER JOIN (SELECT zip_code, race, sum(number) as number, sum(percent) as percent FROM census_race GROUP BY zip_code, race ) b ON (v.zip_code = b.zip_code)"
}


QUERY_OPTIONS = {
    "default": SERVED_GEO,
    "census": CENSUS_SERVED_GEO
}

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser", "city", "state"],
            "fields" : ["num_served"]
        }
    },

    "census_income": {
        "meta": {
            "groups": ["advertiser", "date"],
            "query": "census",
            "fields": ["median_household_income"],
            "static_joins": JOIN["census_income"]
        }
     },

    "census_age_gender": {
        "meta": {
            "groups": ["advertiser", "date", "gender", "min_age", "max_age"],
            "query": "census",
            "fields": ["population", "served_population"],
            "static_joins": JOIN["census_age_gender"]
        }
     },

    "census_race": {
        "meta": {
            "groups": ["advertiser", "date", "race"],
            "query": "census",
            "fields": ["population", "served_population"],
            "static_joins": JOIN["census_race"]
        }
     },

    "none": {
        "meta": {
            "groups" : [],
            "fields" : ["num_served"]
         }
    }
}

GROUPS = {
    "advertiser": "advertiser",
    "state": "state",
    "city": "city",
    "state": "state",
    "country": "country",
    "timezone": "timezone",
    "dma": "dma",
    "zip_code": "zip_code",
    "lat": "coordinates['lat']",
    "long": "coordinates['long']",
    "coordinates": "coordinates"
}

FIELDS = {
    "num_served": "sum(num_served)",
    "median_household_income": "round(sum(b.median_household_income * num_served) / sum(num_served), 0)",
    "served_population": "sum(CASE WHEN v.zip_code IS NOT NULL THEN (num_served*(percent / 100.0)) ELSE 0.0 END)",
    "population": "sum(number)"
}

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "state": "state = '%(state)s'",
    "city": "city = '%(city)s'",
    "country": "country = '%(country)s'",
    "timezone": "timezone = '%(timezone)s'",
    "dma": "dma = '%(dma)s'",
    "zip_code": "zip_code = '%(zip_code)s'"
}

class AdvertiserServedGeoHandler(AdminReportingBaseHandler):
    QUERY = SERVED_GEO
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, db=None, hive=None, spark_sql=None, **kwargs):
        self.db = db
        self.hive = hive
        self.spark_sql = spark_sql

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    def format_data(self,u,groupby,wide):
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
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        return u

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):

        query_list = [
            "SET spark.sql.shuffle.partitions=8",
            query
        ]

        raw = yield run_spark_sql_session_deferred(self.spark_sql,query_list)

        formatted = self.format_data(
            pandas.DataFrame(raw),
            groupby,
            wide
        )

        self.get_content(formatted)

    def get_meta_group(self,default="default"):

        meta = self.get_argument("meta",False)

        if meta:
            return meta

        return default

    @tornado.web.asynchronous
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        wide = self.get_argument("wide",False)

        meta_group = self.get_meta_group()

        meta_data = self.get_meta_data(meta_group,include)
        meta_data["is_wide"] = wide

        if meta:
            self.write(ujson.dumps(meta_data))
            self.finish()

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(),
                self.make_join(meta_data.get("static_joins",""))
            )

            # Get the query string based on the query specified in the metadata
            # If there is no query specified, use the default query
            query = QUERY_OPTIONS[meta_data.get("query", "default")]

            self.get_data(
                self.make_query(params, query),
                meta_data.get("groups",[]),
                self.get_argument("wide", False)
            )

        else:
            self.get_content(pandas.DataFrame())
