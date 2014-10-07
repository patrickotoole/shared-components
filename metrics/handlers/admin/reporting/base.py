import tornado.web 
import logging
from copy import deepcopy

class MetaDataException(Exception):
    pass

class AdminReportingBase(object):
    """
    The non-tornado specific base functions

    Should not be used on it own, but rather needs to be inherited 
    and constants need to overridden
    """

    GROUPS = {}
    FIELDS = {}
    ORDERS = {}
    QUERY = ""
    OPTIONS = {}
    WHERE = {}
    JOINS = {}

    def get_meta_group(self,default="default"):
        # pragma: no coverage
        # to override to support better default selection
        return default

    def get_orders(self, g):
        return self.ORDERS.get(g,g)

    def get_group(self,g):
        return self.GROUPS.get(g,g)
        
    def get_field(self,g):
        group = self.get_group(g)
        select = self.FIELDS.get(group,group)
        return "%s as %s" % (select,g)

    def and_groupings(self,args):
        groupings = {i:j for i,j in args.iteritems() if i in self.WHERE.keys()}
        return groupings

    def or_groupings(self,field,values):
        where_string = self.WHERE.get(field)
        return [where_string % {field:v} for v in values]
     
    def make_query(self,params):
        # pragma: string sub and remove \n
        q = self.QUERY % params
        return " ".join(q.replace('\n',' ').split())

    def make_joins(self,args):
        joins = {i:self.JOINS[i] for i,j in args.iteritems() if i in self.JOINS.keys()}
        return joins

    def get_meta_data(self,meta_group,additional_dims=False):
        try:
            meta_lookup = self.OPTIONS[meta_group]["meta"]
            meta_data = deepcopy(meta_lookup)
        except:
            raise MetaDataException("missing meta data for requested group")

        if additional_dims:
            dims = [dim for dim in additional_dims if dim in self.GROUPS.keys()]
            missing = [dim for dim in additional_dims if dim not in dims]
            if len(missing):
                logging.warn("Some of the requested dimensions do not exist %s " % ",".join(missing))
            meta_data['groups'] += dims

            from collections import OrderedDict
            meta_data['groups'] = list(OrderedDict.fromkeys(meta_data['groups']))

        return meta_data

    def make_params(self,groups,fields,where,joins="", orders="",**kwargs):
        gs = map(self.get_group,groups)
        fs = map(self.get_field,groups + fields)
        os = map(self.get_orders, orders)

        print orders
        print os

        params = {
            "groups": ", ".join(gs),
            "fields": ", ".join(fs),
            "where": where,
            "joins": joins,
            "orders": ", ".join(os)
        } 
        for i,j in kwargs.iteritems():
            params[j] = i
        return params

class AdminReportingBaseHandler(tornado.web.RequestHandler,AdminReportingBase):
    """
    Base handler for admin reporting
    """
    
    def parse_date_where(self):
        from datetime import datetime, timedelta
        date = self.get_argument("date",datetime.now().strftime("%y-%m-%d"))
        if date == "past_week":
            _until = datetime.now().strftime("%y-%m-%d")
            _from = (datetime.now() - timedelta(7)).strftime("%y-%m-%d")
        elif date == "past_month":
            _until = datetime.now().strftime("%y-%m-%d")
            _from = (datetime.now() - timedelta(30)).strftime("%y-%m-%d")
        else:
            _from = self.get_argument("start_date",date)
            _until = self.get_argument("end_date",date)

        return "date>='%s' and date <='%s'" % (_from, _until)

    def parse_qs_where(self):
        args = self.request.arguments
        groups = self.and_groupings(args)
        ands = ["1=1"]
        for i,j in groups.iteritems():
            ors = self.or_groupings(i,j[0].split(","))
            ands += ["(%s)" % "  or ".join(ors)]

        return " and ".join(ands)

    def make_join(self,default=""):
        _args = self.request.arguments
        args = {i:j[0] for i,j in _args.iteritems()}
        joins = self.make_joins(args)

        if len(joins) > 0:
            return " ".join(joins.values()) % args
        else:
            return default

    def make_where(self, date=True):
        where_list = [
            self.parse_qs_where()
        ]

        if date:
            where_list.append(self.parse_date_where())

        return " and ".join(where_list)

    def get(self):
        self.write(self.make_where())

