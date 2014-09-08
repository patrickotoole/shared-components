import tornado.web
from copy import deepcopy

class AdminReportingBase(object):
    """
    The non-tornado specific base functions

    Should not be used on it own, but rather needs to be inherited 
    and constants need to overridden
    """

    GROUPS = []
    FIELDS = []
    QUERY = ""
    OPTIONS = {}

    def get_meta_group(self,default="default"):
        # to override to support better default selection
        return default

    def groups_to_group_helper(self,g):
        return self.GROUPS.get(g,g)
        
    def groups_to_field_helper(self,g):
        group = self.groups_to_group_helper(g)
        select = self.FIELDS.get(group,group)
        return "%s as %s" % (select,g)

    def and_groupings(self,args):
        groupings = {i:j for i,j in args.iteritems() if i in self.WHERE.keys()}
        return groupings

    def or_groupings(self,field,values):
        where_string = self.WHERE.get(field)
        return [where_string % {field:v} for v in values]
     

    def make_query(self,params):
        q = self.QUERY % params
        return " ".join(q.replace('\n',' ').split())

    def get_meta_data(self,meta_group):
        meta_lookup = self.OPTIONS.get(meta_group,{}).get("meta",{})
        meta_data = deepcopy(meta_lookup)

        additional_dims = self.get_argument("include",False)

        if additional_dims:
            meta_data['groups'] += additional_dims.split(",")

        return meta_data

    def make_params(self,groups,fields,where):
        gs = map(self.groups_to_group_helper,groups)
        fs = map(self.groups_to_field_helper,groups + fields)

        return {
            "groups": ",".join(gs),
            "fields": ",".join(fs),
            "where": where
        } 

class AdminReportingBaseHandler(tornado.web.RequestHandler,AdminReportingBase):
    """
    Base handler for admin reporting
    """
    
    def parse_date_where(self):
        from datetime import datetime
        date = self.get_argument("date",datetime.now().strftime("%y-%m-%d"))
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

    def make_where(self):
        where_list = [
            self.parse_date_where(), 
            self.parse_qs_where()
        ]
        return " and ".join(where_list)

