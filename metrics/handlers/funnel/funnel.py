import tornado.web
import ujson
import pandas

from lib.helpers import Convert
from MYSQL_FUNNEL import *
from funnel_base import FunnelBase, FunnelHelpers

class FunnelHandler(FunnelBase,FunnelHelpers):

    def initialize(self, db=None, **kwargs):
        self.db = db

        self.required_cols = [
            "advertiser",
            "funnel_name",
            "actions",
            "owner"
        ]

      

    def get(self,*args):
        advertiser = self.get_argument("advertiser", False)
        format = self.get_argument("format",False)
        if format == "json":
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
            
            grouped_actions = grouped_actions if len(grouped_actions) > 0 else []
            funnel = pandas.DataFrame({"actions":grouped_actions}).reset_index()
            
            as_json = Convert.df_to_json(funnel)
            self.write(as_json)
            self.finish()
        else:
            self.render("analysis/visit_urls.html",data="{}")

        

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
            
            cur.execute(UPDATE_FUNNEL % to_update)

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

            self.insert_funnel_actions(cur,to_add,funnel_id) 
            self.delete_funnel_actions(cur,to_remove,funnel_id) 
            self.update_funnel_actions(cur,to_update,funnel_id)
            
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

    def delete(self):
        funnel_id = self.get_argument("funnel_id",False)

        if funnel_id:
            obj = {"funnel_id": funnel_id}

            try:
                self.db.autocommit = False
                conn = self.db.create_connection()
                cur = conn.cursor()
                
                cur.execute(DELETE_FUNNEL % obj)
                cur.execute(DELETE_FUNNEL_ACTION_BY_ID % obj)

                conn.commit()
                self.write("{'status':'removed'}") 
            except Exception as e:
                self.write("{'status':'%s'}" % e) 
            finally:
                self.db.autocommit = True
                self.finish() 
            
