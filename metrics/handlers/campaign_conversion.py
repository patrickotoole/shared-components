import tornado.web
import ujson
import pandas
import datetime

from twisted.internet import defer

from lib.helpers import *
from lib.hive.helpers import run_spark_sql_session_deferred
from lib.query.HIVE import PIXEL
import lib.query.helpers as query_helpers
from admin.reporting.base import AdminReportingBaseHandler
from base import BaseHandler

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["advertiser","conv_id","campaign"],
            "fields" : ["imps","conv"],
            "formatters" : {
                "segment":"none",
                "timeseries":"timeseries"
            }
        }
    }
}

# s/\(.\{-}\) .*/    "\1":"\1",/g
GROUPS = {
    "advertiser": "advertiser",
    "campaign": "campaign",
    "conv_id": "conv_id",
    "date": "date"
}

FIELDS = {
    "imps": "sum(num_imps)",
    "conv": "sum(num_conv)",
}

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "conv_id": "= '%(segment)s'",
    "order_type": "order_type = '%(order_type)s'",
    "hour": "hour = '%(hour)s'"
}


class CampaignConversionReportingHandler(AdminReportingBaseHandler,BaseHandler):
    QUERY = "SELECT %(fields)s FROM conversions_touched WHERE %(where)s GROUP BY %(groups)s"
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS

    OPTIONS = OPTIONS

    def initialize(self, reporting_db=None, hive=None, spark_sql=None, **kwargs):
        self.db = reporting_db
        self.hive = hive
        self.spark_sql = spark_sql

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("reporting/_pixel.html",data=o)

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

        if groupby and wide == "timeseries":

            def timeseries_group(x):
                _v = x[val_cols].T.to_dict().values()
                return _v
                
            group_cols = [ i for i in groupby if i != "date" and i in u.columns]
            val_cols = [ i for i in u.columns if i not in group_cols]

            u = u.fillna(0).set_index(group_cols + ['date']).unstack('date').fillna(0).stack().reset_index()

            grouped = u.groupby(group_cols).sum()
            
            u = u.fillna(0).groupby(group_cols).apply(timeseries_group)
            grouped['timeseries'] = u
            u = grouped.reset_index()
         
        elif groupby and wide:
            u = u.fillna(0).set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        return u

    @decorators.deferred
    def pull_mysql(self,query):
        print query

        return self.db.select_dataframe(query)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):
        print query
        df = yield self.pull_mysql(query)
        if len(df):
            formatted = self.format_data(
                df,
                groupby,
                wide
            )

            self.get_content(formatted)
        else:
            self.get_content(pandas.DataFrame())

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
        print meta_group
        meta_data = self.get_meta_data(meta_group,include)
        meta_data["is_wide"] = wide

        fields = self.get_argument("fields","").split(",")
        has_fields = len(fields) > 0 and len(fields[0]) > 0

        if has_fields:
            meta_data['fields'] = fields 

        print meta_data

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

            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                wide
            )

        else:
            self.get_content(pandas.DataFrame()) 
