import tornado.web
import ujson
import pandas
import StringIO

API_QUERY = "select * from %s where %s"

class APIHandlerV2(tornado.web.RequestHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db 

    def build_query(self, table, args, start_element=None, num_elements=None, order_by=None):
        if (start_element or num_elements) and not order_by:
            raise Exception("Can't specify pagination without ordering column")

        args_list = ["1=1"]
        args_list += [i + "=" + "".join(j) 
                      for i,j in args.iteritems() 
                      if i not in ["table","format", "num_elements", "start_element", "order_by"]
                      ]

        where = " and ".join(args_list)

        if order_by:
            order = " order by %s" % order_by
            where = where + order

        if start_element and num_elements:
            limit = " limit %s,%s" % (start_element, num_elements)
            where = where + limit
        
        table_query = API_QUERY % (table, where)
        return table_query

    def execute(self, query):
        print query
        data = self.db.select_dataframe(query)
        return data

    def format_data(self, data, format):
        response = ""
        if format == "json":
            l = data.fillna(0).T.to_dict().values()
            response = ujson.dumps(l)
        elif format == "html":
            response = data.to_html()
        elif format == "csv":
            io = StringIO.StringIO()
            data.to_csv(io)
            response = io.getvalue()
            io.close()
            
        return response        
            
    def get(self):
        print "HERE"
        table = self.get_argument("table",False)
        format = self.get_argument("format","json")
        start_element = self.get_argument("start_element", None)
        num_elements = self.get_argument("num_elements", None)
        order_by = self.get_argument("order_by", None)
        
        args = self.request.arguments
        
        if table:
            query = self.build_query(table, args, start_element, num_elements, order_by)
            data = self.execute(query)
            formatted = self.format_data(data, format)
            response = {
                "num_elements": num_elements,
                "start_element": start_element,
                "count": len(data),
                "results": formatted
                }
            self.write(ujson.dumps(response))
        else:
            self.write("""Parameters: ?table=&[format=]&[table_specific_filters=]""")

    def post(self):
        print self.request.body
        self.write("hello")
