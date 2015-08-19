import pandas
import ujson

from lib.helpers import Convert
from lib.helpers import decorators
from funnel_base import FunnelHelpers
from MYSQL_FUNNEL import *

class FunnelDatabase(FunnelHelpers):

    def format_funnel(self, data):
        d = data.fillna(0)
        d['action_id'] = d['action_id'].map(int)
        d['advertiser'] = d['pixel_source_name']

        ordered = self.column_to_list(d,"url_pattern",['order','funnel_id'])

        funnel_indices = ["funnel_name","funnel_id","owner","advertiser"]
        grouped = ordered.groupby(funnel_indices)
        
        action_indices = ['action_id','action_name','url_pattern','order']
        group_fn = self.group_to_dict(action_indices,lambda v: v['action_id'] != 0)
        
        grouped_actions = grouped.apply(group_fn)

        grouped_actions = grouped_actions if len(grouped_actions) > 0 else []
        funnel = pandas.DataFrame({"actions":grouped_actions}).reset_index()

        as_json = Convert.df_to_json(funnel)
        return as_json

    def get_funnels(self, advertiser):
        results = self.get_advertiser_funnels(advertiser)
        return self.format_funnel(results)

    def get_funnel(self, funnel_id):            
        results = self.get_funnel_by_id(funnel_id)
        return self.format_funnel(results)

    def make_to_update(self,obj):
        obj = ujson.loads(obj)

        if "advertiser" not in obj:
            obj["advertiser"] = self.current_advertiser_name

        obj['pixel_source_name'] = obj['advertiser']
        del obj['advertiser']
        funnel_id = obj['funnel_id']

        try:
            self.db.autocommit = False
            conn = self.db.create_connection()
            cur = conn.cursor()

            excludes = ["actions","funnel_id"]
            funnel_fields = ", ".join(["%s=\"%s\"" % (i,j)
                                       for i,j in obj.items()
                                       if not (i in excludes)])

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

        self.perform_insert(obj)
        return obj

    @decorators.multi_commit_cursor
    def perform_insert(self, obj, cursor=None):
        # If the user doesn't specify an advertiser, use the logged-in
        # advertiser as a default
        if "advertiser" in obj:
            Q = "select external_advertiser_id from advertiser where pixel_source_name = '%s'"
            advertiser_id = self.db.select_dataframe(Q % obj['advertiser']).values[0][0]
        else:
            advertiser_id = self.current_advertiser
            obj['advertiser'] = self.current_advertiser_name

        URL = "/segment?advertiser_id=%s" % str(advertiser_id)
        seg_obj = {
            "segment": {
                "short_name":"Funnel: " + obj['funnel_name'] + " - " + obj['advertiser']
                }
            }
        data = self.api.post(URL,ujson.dumps(seg_obj))
        obj['segment_id'] = data.json['response']['segment']['id']

        cursor.execute(INSERT_FUNNEL % obj)
        funnel_id = cursor.lastrowid
        
        for position, action in enumerate(obj["actions"]):
            action_id = action['action_id']
            
                # TODO: should ensure actions belong to the same advertiser
            cursor.execute(INSERT_FUNNEL_ACTIONS % {
                "order":position + 1,
                "action_id": action_id,
                "funnel_id": funnel_id
            })

        obj["funnel_id"] = funnel_id

        # TODO: need to make the segment associated with the funnel
