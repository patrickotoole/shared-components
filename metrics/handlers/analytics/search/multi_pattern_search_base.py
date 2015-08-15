import tornado.web
import pandas
import logging

from search_base import SearchBase
from pattern_search_helpers import PatternSearchHelpers
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *


class MultiPatternSearchBase(SearchBase,PatternSearchHelpers):

    def build_deferred_list(self,steps,logic,advertiser,date_clause,PARAMS):

        deferreds = [] 
        deferred_meta = []

        for step_key, step in enumerate(steps):
            
            for i,group in enumerate(step['pattern_groups']):
                
                terms = group['patterns']
                logic = group['logic']
                    
                deferreds += [self.defer_execute(PARAMS, advertiser, terms, date_clause, logic)]
                deferred_meta += [{
                    "step": step_key,
                    "group": i,
                    "group_logic": step['logic'],
                    "terms": ",".join(group['patterns']),
                }] 

        return (deferred_meta,defer.DeferredList(deferreds))

    def build_funnel_groups(self,frames,meta):
        # this function takes in the frames and the meta data associated with the 
        # deferred objects and returns the appropriate data for each group

        steps_list, group_list, group_terms = [], [], []
        current_step = 0

        # taking all the deferred frames
        # and applying the appropriate grouping strategy
        for dm,deferred in zip(meta,frames):

            df = deferred[1]
            df['terms'] = dm['terms']

            if dm['step'] != current_step:
                # if moving on to a new group, calculate the group logical merge
                calced_group = self.calc_group(group_list,dm['group_logic'],group_terms)

                steps_list.append(calced_group) 
                group_terms = [dm['terms']]
                group_list = [df]

                current_group = dm['group']
                current_step = dm['step']

            elif dm['step'] == current_step:
                # if this is within the group, just append
                group_terms.append(dm['terms'])
                group_list.append(df)


        calced_group = self.calc_group(group_list,dm['group_logic'],group_terms)
        steps_list.append(calced_group)

        return steps_list

    def reshape_funnel_groups(self,funnel_groups):
        #reshapes list of dfs into a single dataframe
        base_df, dfs = self.head_and_tail(funnel_groups)
        base_df["step"] = "step_%s" % 1
        for i,df in enumerate(dfs):
            df["step"] = "step_%s" % (2 + i)
            base_df = base_df.append(df)

        data = base_df.groupby(["uid","step"]).first()
        data = data.unstack("step").apply(lambda x: x > 0)['index'].reset_index() 
        print data.head()
        return data

    def funnel_response(self,funnel_data,num_steps):
        steps = range(1,1+num_steps)

        gs = []
        for step_num,t in enumerate(steps):
            step_num += 1
            columns = steps[:step_num] 
            mask = (funnel_data[columns].T.sum() == len(columns))
            masked = funnel_data[mask]
            step = { 
                "step":step_num,
                "uids":len(masked['uid'].tolist() )
            } 
            gs.append(step)

        return gs 
            

    def calc_group(self,frames,logic,group_terms):
        
        df = frames[0]
        for df2 in frames[1:]:
            df = df.append(df2)
            df = df.drop_duplicates()

        df = df.reset_index()

        if logic == "and":
            df = self.pattern_and(df,group_terms)

        return df


    @defer.inlineCallbacks
    def get_uids(self, advertiser, terms, date_clause, timeout=60):
        PARAMS = "uid"
        indices = [PARAMS]
        response = self.default_response(terms,terms['logic'])

        meta, deferreds = self.build_deferred_list(
            terms['steps'],
            terms['logic'],
            advertiser,date_clause,PARAMS
        )

        frames = yield deferreds
        funnel_frames = self.build_funnel_groups(frames,meta)
        funnel_data = self.reshape_funnel_groups(funnel_frames)
        
        response['results'] = self.funnel_response(funnel_data,len(terms['steps']))
        
        
        self.write_json(response)



    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60,timeseries=False):
        PARAMS = "date, url, uid"
        indices = PARAMS.split(", ")

        response = self.default_response(pattern_terms,logic,no_results=True)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        

        # PUSH all the data into one dataframe AND count view
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
        df = self.group_count_view(df,terms,indices) 

        for terms in remaining_terms:
            df2 = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must")
            df2 = self.group_count_view(df2,terms,indices)

            df = df.append(df2)
            df = df.reset_index().drop_duplicates(indices).set_index(indices)

        df = df.reset_index()


        # APPLY "and" logic if necessary
        if logic == "and":
            df = self.pattern_and(df,pattern_terms)


        # PREPARE the final version of the data for response
        if len(df) > 0:
            stats = df.groupby("date").apply(self.calc_stats)

            response['summary']['num_users'] = len(set(df.uid.values))
            response['summary']['num_views'] = stats.num_views.sum()
            response['summary']['num_visits'] = stats.num_visits.sum()
            
            if timeseries:
                results = Convert.df_to_values(stats.reset_index())
                response['results'] = results
        
        self.write_json(response)


    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)

    def get_domains(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)

