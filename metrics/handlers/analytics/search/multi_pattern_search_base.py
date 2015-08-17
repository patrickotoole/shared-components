import tornado.web
import pandas
import logging

from search_base import SearchBase
from pattern_search_helpers import PatternSearchHelpers
from ..visit_domains import VisitDomainBase
from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *


class MultiPatternSearchBase(VisitDomainBase,SearchBase,PatternSearchHelpers):

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
                "uids":masked['uid'].tolist()
            } 
            step['count'] = len(step['uids'])
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
    def defer_get_uids(self, advertiser, terms, date_clause, timeout=60):
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
        
        defer.returnValue(response)

    @defer.inlineCallbacks
    def get_uids(self, advertiser, terms, date_clause, timeout=60):
        
        response = yield self.defer_get_uids(advertiser, terms, date_clause, timeout=timeout)
        self.write_json(response)

    @defer.inlineCallbacks
    def get_count(self, advertiser, terms, date_clause, timeout=60):
        
        response = yield self.defer_get_uids(advertiser, terms, date_clause, timeout=timeout)
        for step in response['results']:
            del step['uids']

        self.write_json(response)

    @defer.inlineCallbacks
    def get_domains(self, advertiser, terms, date_clause, timeout=60):
        response = yield self.defer_get_uids(advertiser, terms, date_clause, timeout=timeout)
        defs = [self.defer_get_domains(step['uids'],date_clause) for step in response['results']]

        dl = defer.DeferredList(defs)
        step_domains = yield dl

        for i,domains in enumerate(step_domains):
            del response['results'][i]['uids']
            counts = domains[1].groupby("domain").agg({"uid":lambda x: len(set(x))})
            counts = counts.reset_index().T.to_dict().values()
            response['results'][i]['domains'] = counts

        self.write_json(response)


