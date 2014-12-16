import tornado.web
import ujson
import pandas
import StringIO

API_QUERY = "select * from %s where %s "

class APIHandler(tornado.web.RequestHandler):
    def initialize(self, db=None, **kwargs):
        self.db = db 

    def get(self):
        response = ""
        table = self.get_argument("table",False)
        if table:
            response_format = self.get_argument("format","json")
            args = self.request.arguments
            
            args_list = ["1=1"]  
            args_list += [i + "=" + "".join(j) 
                for i,j in args.iteritems() 
                if i not in ["table","format"]
            ]

            where = " and ".join(args_list)

            table_query = API_QUERY % (table, where)
            data = self.db.select_dataframe(table_query)
            
            if response_format == "json":
                l = data.fillna(0).T.to_dict().values()
                response = ujson.dumps(l)
            elif response_format == "html":
                response = data.to_html()
            elif response_format == "csv":
                io = StringIO.StringIO()
                data.to_csv(io)
                response = io.getvalue()
                io.close()

            self.write(response)
        else:
            self.write("""Parameters: ?table=&[format=]&[table_specific_filters=]""")

    def post(self):
        print self.request.body
        self.write("hello")
