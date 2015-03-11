import pandas
import tornado.web
import ujson

from twisted.internet import defer

from lib.helpers import *
from lib.mysql.helpers import run_mysql_deferred
from lib.query.MYSQL import DOMAIN_CATEGORY
from ..base import AdminReportingBaseHandler

OPTIONS = {
    "default": {
        "meta": {
            "groups" : ["parent_category", "category"],
            "fields" : ["imps_per_day", "users_per_day", "percent_of_imps", "percent_of_users"]
        }
    },

    "parent_category": {
        "meta": {
            "groups": ["category", "domain"],
            "fields": ["imps_per_day", "users_per_day", "percent_of_imps", "percent_of_users"]
        }
    },

    "category": {
        "meta": {
            "groups": ["category", "domain"],
            "fields": ["imps_per_day", "users_per_day", "percent_of_imps", "percent_of_users"]
        }
    }
}

GROUPS = {
    "category_id": "a.category_id",
    "audit_status": "audit_status",
    "category": "a.category_name",
    "parent_category": "parent_category_name",
    "domain": "domain"
}

FIELDS = {
    "percent_of_imps": "round(sum(percent_of_imps) * 100, 4)",
    "percent_of_users": "round(sum(percent_of_users) * 100, 4)",
    "total_imps": "sum(total_imps)",
    "total_users": "sum(total_users)",
    "imps_per_day": "round(sum(imps_per_day))",
    "users_per_day": "round(sum(users_per_day))"
}

WHERE = {
    "category_id": "a.category_id = '%(category_id)s'",
    "audit_status": "audit_status = '%(audit_status)s'",
    "category": 'a.category_name = "%(category)s"',
    "parent_category": 'parent_category_name = "%(parent_category)s"',
    "domain": "domain like '%%%(domain)s%%'"
}

LIMIT = {
    "limit": "%(limit)s"
}

class DomainCategoriesHandler(AdminReportingBaseHandler):

    QUERY = DOMAIN_CATEGORY
    WHERE = WHERE
    FIELDS = FIELDS
    GROUPS = GROUPS
    LIMIT = LIMIT

    OPTIONS = OPTIONS

    def initialize(self, db=None, api=None, hive=None, spark_sql=None):
        self.db = db 

    @classmethod
    def reformat_domain_data(self,data):
        data = data.fillna("NULL")
        #helper
        def split_help(x):
            s = x.replace(" ","").split(".")
            if len(s[-1]) > 2:
                return ".".join(s[-2:])
            else:
                return ".".join(s[-3:])

        data["domain"] = data.domain.map(lambda x: split_help(x))
        data["domain"] = data.domain.map(lambda x: x.replace("$","").replace("]",""))
        data = data.groupby([c for c in data.columns if c != "num_auctions"]).sum()
        return data.reset_index()
        

    @decorators.formattable
    def get_content(self,data):

        def default(self,data):
            if "domain" in data.columns:
                data = self.reformat_domain_data(data)

            o = Convert.df_to_json(data)
            self.render("admin/reporting/target_list.html",data=o)

        yield default, (data,)

    def format_data(self,u,groupby,wide):
        if groupby and wide:
            u = u.set_index(groupby).sort_index()
            u = u.stack().unstack(wide)

            new_index = [i if i else "" for i in u.index.names]
            u.index.rename(new_index,inplace=True)
            u = u.reset_index().reset_index()
            u.rename(columns={"index":"__index__"},inplace=True) 

        return u

    @defer.inlineCallbacks
    def get_data(self, query, groupby=False, wide=False):

        df = yield run_mysql_deferred(self.db,query)
        
        formatted = self.format_data(
            df.fillna(value="NA"),
            groupby,
            wide
        )

        self.get_content(formatted)

    def get_meta_group(self,default="default"):
        meta = self.get_argument("meta", False)
        category = self.get_argument("category", False)
        parent_category = self.get_argument("parent_category", False)
        
        if meta:
            return meta
        elif category:
            return "category"
        elif parent_category:
            return "parent_category"

        return default

    @tornado.web.asynchronous
    @decorators.meta_enabled
    @decorators.help_enabled
    def get(self,meta=False):
        formatted = self.get_argument("format",False)
        include = self.get_argument("include","").split(",")
        meta_group = self.get_meta_group()
        meta_data = self.get_meta_data(meta_group,include)
        fields = self.get_argument("fields", "").split(",")
        has_fields = len(fields) > 0 and len(fields[0]) > 0

        if has_fields:
            meta_data["fields"] = fields

        if formatted:
            params = self.make_params(
                meta_data.get("groups",[]),
                meta_data.get("fields",[]),
                self.make_where(date=False),
                limit = self.make_limit()
            )
            print params
            self.get_data(
                self.make_query(params),
                meta_data.get("groups",[]),
                self.get_argument("wide",False)
            )

        else:
            self.get_content(pandas.DataFrame())


