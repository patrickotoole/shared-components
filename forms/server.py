import tornado.websocket
import os
import logging
import json

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.platform.twisted

tornado.platform.twisted.install()

from twisted.internet import reactor
from shutdown import sig_wrap
from tornado.options import define, options, parse_command_line

dirname = os.path.dirname(os.path.realpath(__file__))

define("port", default=8888, help="run on the given port", type=int)

from link import lnk


class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False) 
        self.rb = kwargs.get("rb",False) 

        pass

    def get(self):
        logging.info("got index")
        forms = self.db.select_dataframe("select * from forms where active = 1 and deleted = 0")
        form_fields = self.db.select_dataframe("select * from form_fields where active = 1 and deleted = 0")
        form_fields['last_activity'] = forms['last_activity'].map(lambda x: x.isoformat())
        form_fields['values'] = form_fields['values'].map(lambda x: eval(x) if x and len(x) > 0 else x )

        for i,row in form_fields.iterrows():
            if (row.sql):
                df = self.rb.select_dataframe(row.sql)
                values = df.to_dict('records')
                form_fields.ix[i,'values'] = {"values":values}

        form_fields['values'] = form_fields['values'].map(lambda x: x['values'] if x else x)

        forms = forms.set_index("id")
        forms['last_activity'] = forms['last_activity'].map(lambda x: x.isoformat())

        form_fields_grouped = form_fields.groupby("form_id").apply( lambda x: x.to_dict("records") )
        forms['fields'] = form_fields_grouped

        forms_json = json.dumps(forms.to_dict("record"))

        self.render("index.html",forms=forms_json)

    def post(self):
        data = json.loads(self.request.body)
        assert(data['name'] != "")
        assert(data['name'])

        assert(len(data['fields']) > 0)
        

        result = self.db.execute("INSERT INTO forms (name, script) VALUES (%s, %s)", (data['name'],data.get("script",None) ) )
        form_id = int(result)


        for row in data['fields']:
            row['form_id'] = form_id

            row['default_type'] = row.get('default_type',"none")
            row['type'] = row.get('type',"input")


            if row['default_type'] == "json":
                row['values'] = row.get('default_value',"")

            if row['default_type'] == "sql":
                row['sql'] = row.get('default_value',"")

            self.db.execute("INSERT INTO form_fields (form_id, name, type, `values`, `sql`) VALUES (%s, %s, %s, %s, %s)",  (row['form_id'], row['name'], row['type'], row.get("values",""), row.get("sql","")) )


class SubmitHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False)

    def post(self):
        data = json.loads(self.request.body)
        import requests

        dd = { "udf": data['script'], "priority":1 }
        for d in data['data']:
            dd[d['key']] = d['value']

        from link import lnk
        wq = lnk.api.workqueue
        wq.post("/jobs",data=json.dumps(dd))

        


if __name__ == '__main__':

    parse_command_line()

    connectors = {
        "db": lnk.dbs.crushercache,
        "rb": lnk.dbs.rockerbox,

        "api": lnk.api.console
    }

    routes = [
        (r'/', IndexHandler, connectors),
        (r'/submit', SubmitHandler, connectors),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {"path":"static"}),
    ]

    app = tornado.web.Application(
        routes, 
        template_path= dirname,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    
    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    tornado.ioloop.IOLoop.instance().start()
