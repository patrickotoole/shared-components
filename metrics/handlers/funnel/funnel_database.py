import pandas
import ujson

from lib.helpers import Convert
from lib.helpers import decorators
from funnel_helpers import FunnelHelpers
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

    def update_funnel(self,body):
        funnel = ujson.loads(body)
        self.assert_required_params(["id"])
        funnel_id = self.get_argument("id")

        if "advertiser" not in funnel:
            funnel["advertiser"] = self.current_advertiser_name

        funnel['pixel_source_name'] = funnel['advertiser']
        del funnel['advertiser']

        return self.perform_update(funnel, funnel_id)

    def insert_funnel(self,body):
        funnel = ujson.loads(body)
        self.assert_not_present(funnel, ["id"])
        self.assert_required(funnel, self.required_cols)

        funnel = self.perform_insert(funnel)
        return funnel

    def delete_funnel(self):
        self.assert_required_params(["id"])
        funnel_id = self.get_argument("id",False)
        self.perform_delete({"funnel_id": funnel_id})
        return "Funnel id %s deleted successfully." % funnel_id

    @decorators.multi_commit_cursor
    def perform_delete(self, obj, cursor=None):
        cursor.execute(DELETE_FUNNEL % obj)
        cursor.execute(DELETE_FUNNEL_ACTION_BY_ID % obj)

    @decorators.multi_commit_cursor
    def perform_update(self, obj, funnel_id, cursor=None):
        excludes = ["actions","funnel_id"]
        funnel_fields = ", ".join(["%s=\"%s\"" % (i,j)
                                   for i,j in obj.items()
                                   if not (i in excludes)])

        to_update = {
            "funnel_id": funnel_id,
            "fields":funnel_fields
        }

        cursor.execute(UPDATE_FUNNEL % to_update)
        
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

        self.insert_funnel_actions(cursor,to_add,funnel_id)
        self.delete_funnel_actions(cursor,to_remove,funnel_id)
        self.update_funnel_actions(cursor,to_update,funnel_id)

        obj['advertiser'] = obj['pixel_source_name']
        del obj['pixel_source_name']

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
        return obj
        # TODO: need to make the segment associated with the funnel
