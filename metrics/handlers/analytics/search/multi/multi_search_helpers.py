import time
from ..pattern.helpers import PatternSearchHelpers

class CacheSingleton(dict):

    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(CacheSingleton, cls).__new__(
                                cls, *args, **kwargs)
        return cls._instance

SHITTY_CACHE = CacheSingleton()
SHITTY_CACHE['LAST'] = 0

class MultiSearchHelpers(PatternSearchHelpers):    

    def check_cache(self,key):
        epoch_time = int(time.time())
        last_access = SHITTY_CACHE['LAST']

        if epoch_time - last_access < 30:
            return SHITTY_CACHE.get(key,False)

        return False

    def set_cache(self,key,value):

        epoch_time = int(time.time())
        last_access = SHITTY_CACHE['LAST']


        if epoch_time - last_access > 30:
            for k in SHITTY_CACHE.keys():
                del SHITTY_CACHE[k]

        SHITTY_CACHE['LAST'] = epoch_time 
        SHITTY_CACHE[key] = value

        return value
        

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

    def funnel_response(self,funnel_data,num_steps,step_sizes):
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
            step['total_count'] = step_sizes[step_num-1]
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



