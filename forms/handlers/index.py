import tornado.web
import logging
import json

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
                if "crushercache" in row.sql:
                    df = self.db.select_dataframe(row.sql)
                else:
                    df = self.rb.select_dataframe(row.sql)
                values = df.to_dict('records')
                form_fields.ix[i,'values'] = {"values":values}

        form_fields['values'] = form_fields['values'].map(lambda x: x['values'] if type(x) == dict else x)

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

        result = self.db.execute("INSERT INTO forms (name, script, description) VALUES (%s, %s, %s)", (data['name'],data.get("script",None),data.get("description",None) ) )
        form_id = int(result)


        for row in data['fields']:
            row['form_id'] = form_id

            row['default_type'] = row.get('default_type',"none")
            row['type'] = row.get('type',"input")


            if row['default_type'] == "json":
                row['values'] = row.get('default_value',"")

            if row['default_type'] == "sql":
                row['sql'] = row.get('default_value',"")

            self.db.execute("INSERT INTO form_fields (form_id, name, type, `values`, `sql`, description) VALUES (%s, %s, %s, %s, %s, %s)",  (row['form_id'], row['name'], row['type'], row.get("values",""), row.get("sql",""), row.get("description","")) )



