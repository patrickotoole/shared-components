import tornado.web
import ujson
import pandas

from lib.helpers import Convert
from MYSQL_FUNNEL import *

class FunnelHelpers(object):

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
 
class FunnelBase():

    def update_funnel_actions(self,cur,to_update,funnel_id):
        excludes = ["funnel_id","action_id"]
        for i,values in to_update[["action_id","order"]].iterrows():
            items = values.to_dict().items()
            action_fields = ", ".join(["`%s`=\"%s\"" % (i,j) for i,j in items if not (i in excludes)])
            action_id = values.to_dict()['action_id']

            cur.execute(UPDATE_FUNNEL_ACTION % {
                "fields": action_fields,
                "funnel_id": funnel_id,
                "action_id": action_id 
            })
     
    def insert_funnel_actions(self,cur,to_add,funnel_id):
        for i,values in to_add[["action_id","order"]].iterrows():
            add = values.to_dict()

            cur.execute(INSERT_FUNNEL_ACTIONS % {
                "order": add['order'],
                "action_id": add['action_id'],
                "funnel_id": funnel_id
            })
             
    def delete_funnel_actions(self,cur,to_remove,funnel_id):
        for i,values in to_remove[["action_id","order"]].iterrows():
            remove = values.to_dict()

            cur.execute(DELETE_FUNNEL_ACTION % {
                "order": remove['order'],
                "action_id": remove['action_id'],
                "funnel_id": funnel_id
            })

    def get_from_db(self,where):
        QUERY = GET % {"where": where}
        return self.db.select_dataframe(GET % {"where": where})

    def get_all(self):
        where = "1=1"
        return self.get_from_db(where)

    def get_advertiser_funnels(self, advertiser):
        where = "a.pixel_source_name = '{}'".format(advertiser)
        return self.get_from_db(where)

    def get_funnel_by_id(self, _id):
        where = "a.funnel_id = '{}'".format(_id)
        return self.get_from_db(where)
