import pandas
import tornado.web
import ujson
import json
import numpy as np

from twisted.internet import defer

from lib.helpers import *
from lib.mysql.helpers import run_mysql_deferred
from lib.query.MYSQL import TOP_URLS
from ..base import AdminReportingBaseHandler

JOINS = {
}

QUERY_OPTIONS = {
    "default": TOP_URLS
}

OPTIONS = {
    "default": {
        "meta": {
            "groups": ["advertiser", "url", "type"],
            "fields": ["views", "users"]
        }
    }
}

GROUPS = {
    "advertiser":"advertiser",
    "url": "url",
    "type": "type"
    }


FIELDS = {
    "views": "sum(views)",
    "users": "sum(users)"
    }

WHERE = {
    "advertiser": "advertiser = '%(advertiser)s'",
    "url": "url like '%%(url)s%'"
    }

LIMIT = {
    "limit": "%(limit)s"
}

class PixelUrlHandler(AdminReportingBaseHandler):

    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    LIMIT = LIMIT

    OPTIONS = OPTIONS
    QUERY_OPTIONS = QUERY_OPTIONS

    def initialize(self, reporting_db=None):
        self.reporting_db = reporting_db

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    @defer.inlineCallbacks
    def get_data(self,query,groupby=False,wide=False):
        df = yield run_mysql_deferred(self.reporting_db,query)

        formatted = self.format_data(
            df.fillna(value="NA"),
            groupby,
            wide
        )

        self.get_content(formatted)

    # Function to normalize a series (used to generate bubble sizes)
    def normalized(self, series, base, scale_factor):
        max = series.max()
        min = series.min()
        return ((series - min) / (max-min) * scale_factor) + base

    def format_data(self, u, groupby, wide):
        if groupby and wide:
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True)

        meta = self.get_argument("meta", False)

        if meta and "bubble" in meta:
            u["bubble_size"] = self.normalized(u.tf_idf, 1000, 5000)

        limit = self.get_argument("limit", False)
        if limit:
            u = u.head(int(limit))

        return u
        
    def get_meta_group(self,default="default"):
        meta = self.get_argument("meta", False)
        advertiser = self.get_argument("advertiser", False)

        if meta=="topics" and advertiser:
            return "advertiser_topics"
        elif meta:
            return meta

        return default

    @tornado.web.asynchronous
    @decorators.meta_enabled
    @decorators.help_enabled
    def get(self, meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        fields = self.get_argument("fields","").split(",")
        has_fields = len(fields) > 0 and len(fields[0]) > 0

        if has_fields:
            meta_data['fields'] = fields

        elif formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(date=False),
                joins = self.make_join(meta_data.get("static_joins","")),
                having = self.make_having(),
                limit = self.make_limit()
            )

            # Get the query string based on the query specified in the metadata
            # If there is no query specified, use the default query
            query = QUERY_OPTIONS[meta_data.get("query", "default")]

            self.get_data(
                self.make_query(params, query),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())
