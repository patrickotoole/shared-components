import tornado.web
import ujson
import pandas
from lib.helpers import Convert

GET = """
SELECT  
    a.funnel_id,
    a.funnel_name,
    a.owner,
    a.pixel_source_name,
    b.action_name,
    b.operator,
    c.order,
    d.*
FROM funnel a 
    LEFT JOIN funnel_actions c ON a.funnel_id = c.funnel_id
    LEFT JOIN action b ON b.action_id = c.action_id
    LEFT JOIN action_patterns d ON b.action_id = d.action_id
WHERE
%(where)s
"""

GET_FUNNEL_ACTION = """
SELECT * FROM funnel_actions
WHERE funnel_id = %s
"""

INSERT_FUNNEL = """
INSERT INTO funnel
    (funnel_name, owner, pixel_source_name) 
VALUES 
    ("%(funnel_name)s", "%(owner)s", "%(advertiser)s")
"""

UPDATE_FUNNEL_ACTION = """
UPDATE funnel_actions SET %(fields)s
WHERE funnel_id = %(funnel_id)s and action_id = %(action_id)s
"""

DELETE_FUNNEL_ACTION = """
DELETE FROM funnel_actions 
WHERE funnel_id = %(funnel_id)s and action_id = %(action_id)s
"""
 

UPDATE_FUNNEL = """
UPDATE funnel SET %(fields)s
WHERE funnel_id = %(funnel_id)s
"""

INSERT_FUNNEL_ACTIONS = """
INSERT INTO funnel_actions
    (funnel_id, action_id, `order`)
VALUES
    (%(funnel_id)s, %(action_id)s, %(order)s)
"""

class FunnelHandler(tornado.web.RequestHandler):

    def initialize(self, db=None, **kwargs):
        self.db = db

        self.required_cols = [
            "advertiser",
            "funnel_name",
            "actions",
            "owner"
        ]

    def get_all(self):
        where = "1=1"
        return self.db.select_dataframe(GET.format(where))       

    def get_advertiser_funnels(self, advertiser):
        where = "a.pixel_source_name = '{}'".format(advertiser)
        Q = GET % {"where": where} 
        return self.db.select_dataframe(Q)

    def get_funnel_by_id(self, _id):
        where = "a.funnel_id = '{}'".format(_id)
        Q = GET % {"where": where} 
        return self.db.select_dataframe(Q)
     

    def add_grouper_column(self,df,columns=["order","funnel_id"]):
        # makes a grouper column because pandas #sucks

        serieses = map(lambda col: df[col],columns)
        df["+".join(columns)] = reduce(lambda s1,s2: s1.map(str) + s2.map(str),serieses)

        return "+".join(columns)

    def column_to_list(self,df,column="url_pattern",groupby=['order','funnel_id']):
        # converts a column in a dataframe to a list by grouping
        # final dataframe has same columns, but compressed along the groupby dimensions
        # and a list for the compressed column

        agg_dict = {col: max for col in df.columns}
        agg_dict[column] = lambda x: list(x)

        grouper_name = self.add_grouper_column(df,groupby)

        grouped = df.groupby(grouper_name)
        result = grouped.agg(agg_dict).reset_index(drop=True)

        return result

    def group_to_dict(self,columns,accepted=lambda x: True):
        # made for use in grouped.apply(fn)
        # converts a dataframe grouping to a dictionary
        # final product of grouped.apply => series[dict]
        
        def g2d(df):
            values = df[columns].T.to_dict().values()
            return [v for v in values if accepted(v)]

        return  g2d
        

    def get(self,*args):
        advertiser = self.get_argument("advertiser", False)
        _id = self.get_argument("id", False) 
        if advertiser:
            results = self.get_advertiser_funnels(advertiser)
        elif _id:
            results = self.get_funnel_by_id(_id) 
        else:
            results = self.get_all()

        results = results.fillna(0)
        results['action_id'] = results['action_id'].map(int)
        results['advertiser'] = results['pixel_source_name']
        

        ordered = self.column_to_list(results,"url_pattern",['order','funnel_id'])

        funnel_indices = ["funnel_name","funnel_id","owner","advertiser"]
        grouped = ordered.groupby(funnel_indices)

        action_indices = ['action_id','action_name','url_pattern'] 
        group_fn = self.group_to_dict(action_indices,lambda v: v['action_id'] != 0) 
        
        grouped_actions = grouped.apply(group_fn)
        funnel = pandas.DataFrame({"actions":grouped_actions}).reset_index()
        
        as_json = Convert.df_to_json(funnel)
        self.write(as_json)
        self.finish()

    def make_to_update(self,body):

        obj = ujson.loads(body)
        obj['pixel_source_name'] = obj['advertiser']
        del obj['advertiser']
        funnel_id = obj['funnel_id'] 

        try:
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()

            excludes = ["actions","funnel_id"]
            funnel_fields = ", ".join(["%s=\"%s\"" % (i,j) for i,j in obj.items() if not (i in excludes)]) 

            to_update = {
                "funnel_id": funnel_id,
                "fields":funnel_fields
            }
            
            try:
                cur.execute(UPDATE_FUNNEL % to_update)
            except Exception as e:
                print e

            actions_df = pandas.DataFrame(obj["actions"])
            actions_df['order'] = actions_df.index + 1
            actions_df = actions_df[["action_id","order"]]

            existing_df = self.db.select_dataframe(GET_FUNNEL_ACTION % funnel_id)
            existing_df = existing_df[['action_id','order']]

            merged = actions_df.merge(existing_df,how="outer",suffixes=("","_old"),on="action_id")

            to_add = merged[merged['order_old'].isnull()]  
            to_remove = merged[merged['order'].isnull()]

            to_update = merged[
                ~(merged["order"] == merged["order_old"]) &
                ~(merged['order_old'].isnull()) &
                ~(merged['order'].isnull())
            ]
            funnel_action_excludes = ["funnel_id","action_id"]


            for i,values in to_remove[["action_id","order"]].iterrows():
                remove = values.to_dict()

                cur.execute(DELETE_FUNNEL_ACTION % {
                    "order": remove['order'],
                    "action_id": remove['action_id'],
                    "funnel_id": funnel_id
                })

            for i,values in to_add[["action_id","order"]].iterrows():
                add = values.to_dict()

                cur.execute(INSERT_FUNNEL_ACTIONS % {
                    "order": add['order'],
                    "action_id": add['action_id'],
                    "funnel_id": funnel_id
                })

            for i,values in to_update[["action_id","order"]].iterrows():
                items = values.to_dict().items()
                action_fields = ", ".join(["`%s`=\"%s\"" % (i,j) for i,j in items if not (i in excludes)])
                action_id = values.to_dict()['action_id']

                cur.execute(UPDATE_FUNNEL_ACTION % {
                    "fields": action_fields,
                    "funnel_id": funnel_id,
                    "action_id": action_id 
                })

            obj['advertiser'] = obj['pixel_source_name']
            del obj['pixel_source_name']                 

            conn.commit()

        except Exception as e:
            print e
            conn.rollback()
            raise e
        finally:
            self.autocommit = True            

        return obj

    def make_to_insert(self,body):

        obj = ujson.loads(body)
        all_cols = [ i for i in self.required_cols if i in obj.keys() ]
        
        if len(all_cols) != len(self.required_cols):
            raise Exception("required_columns: {}".format(', '.join(self.required_cols)))

        try:
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()
            
            cur.execute(INSERT_FUNNEL % obj)
            funnel_id = cur.lastrowid

            for position, action in enumerate(obj["actions"]):
                action_id = action['action_id']

                # TODO: should ensure actions belong to the same advertiser
                cur.execute(INSERT_FUNNEL_ACTIONS % {
                    "order":position + 1,
                    "action_id": action_id,
                    "funnel_id": funnel_id
                })

            obj["funnel_id"] = funnel_id

            conn.commit()

        except Exception as e:
            print e
            conn.rollback()
            raise e
        finally:
            self.autocommit = True            

        return obj

    def put(self):
        try:
            if "funnel_id" not in self.request.body:
                raise Exception("must contain a funnel_id in json to update")
            data = self.make_to_update(self.request.body)
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))
 

    def post(self):
        try:
            data = self.make_to_insert(self.request.body)
            self.write(ujson.dumps({"response": data, "status": "ok"}))
        except Exception, e:
            print e
            self.write(ujson.dumps({"response": str(e), "status": "error"}))

