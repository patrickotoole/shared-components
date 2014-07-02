import tornado.web
import ujson
import pandas
import StringIO

API_QUERY = "select * from appnexus_reporting.%s where %s "

class ProfileHandler(tornado.web.RequestHandler):
    def initialize(self, db, api, bidder):
        self.db = db 
        self.api = api
        self.bidder = bidder 


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
            j = self.api.get('/member').json

            self.render("../bidder_profile.html")
            self.write(ujson.dumps(j))


    def post(self):
        #bidder_profile = self.bidder.get('profile/222/5126120',data=ujson.dumps(post_data)).json
        self.write("hello world")
        #self.write(bidder_profile)
