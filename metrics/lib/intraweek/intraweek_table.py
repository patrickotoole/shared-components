from pandas import *
import pandas as pd
import sys
from link import lnk
import math
import datetime

from queries import *
from decorators import *
from intraweek_base import IntraWeekBase, IntraWeekDB


class IntraWeekTable(IntraWeekDB):
    """
    We should be building a table here to do some stuff with it later.
    Tell me more about what we can expect in the table.
    """

    def get_table(self,advertiser_id, target_cpa):
        """
        ## NEEDS DOC STRING
        ## what does this function do
        """
        
        # process arguments
        try:
          num_advertiser=int(advertiser_id)
        except:
          print "pass one argument - advertiser ID"
          sys.exit(0)

        self.df_charges = self.pull_charges(num_advertiser)
        if (len(self.df_charges) == 0): # this advertiser doesn't exist
          return pd.DataFrame(['advertiser not found in DB'])

        self.df_charges = self.fill_historical_cpm(self.df_charges)

        self.df_conversions = self.pull_conversions(num_advertiser)
        self.dfs_tuple = self.make_weight_lists(self.df_charges, self.df_conversions)
        self.df_full = self.add_num_conversions(self.dfs_tuple[0], self.dfs_tuple[1])
        self.df_full = self.add_cpm_columns(self.df_full, num_advertiser)
        self.df_full = self.adjust_charge_client(self.df_full)
        self.df_full = self.finishing_formats(self.df_full) #2.08s
    
        return self.df_full

    # Testing inputs
    # 1. have all historical cpm_multipliers null
    # 2. have none of historical cpm_multipliers null
    # 3. mixed number of cpm_multipliers null
    def fill_historical_cpm(self,df):
        
        # fill in 'charged_client' historical values if cpm_multiplier was null
        # for the most recent week, cpm_multiplier gets overwritten by average in "this_multiplier"
        df_charges = df.copy()
        for week_idx in range(len(df_charges)):
          old_multiplier = df_charges['cpm_multiplier'][df_charges.index[week_idx]]
          if old_multiplier == None or math.isnan(old_multiplier):
            df_charges['cpm_multiplier'][df_charges.index[week_idx]] = 1
            cost = df_charges['media_cost'][df_charges.index[week_idx]]
            if week_idx < len(df_charges) - 1:
              df_charges['charged_client'][df_charges.index[week_idx]] = cost
        return df_charges

    def pull_conversions(self, num_advertiser):
        
        format = r'%X%V%W'
        if not hasattr(self, 'conversions'):
            self.conversions = s = self.my_db.select(CONVERSIONS).as_dataframe()
        
        mask = self.conversions['external_advertiser_id'] == num_advertiser
        return self.conversions[mask].drop('external_advertiser_id', axis=1)


    # Testing inputs:
    # vary the number of conversion types that you have - 1, 2, 3 distinct conversions
    # will need to poke through DBs to figure out a unique set
    def make_weight_lists(self, df_charges, df_conversions):
        
        # make a list of dataframes/weights containing corresponding to 
        # each distinct pixel_id (Signup and Purchase)
        dfs_convs = []
        weights_convs = []
        for pixel_id in set(df_conversions['pixel_id']):
          mask = df_conversions['pixel_id'] == pixel_id
          to_add = df_conversions[mask].set_index('wk_no')
          new_name = self.get_pixel_name(pixel_id) + "_conversions"
          to_add = to_add.rename(columns={'num_conversions': new_name })
          to_add = to_add.drop('pixel_id', axis=1)
          dfs_convs.append(to_add)
          
          # assign weights, hard-coded here
          # TODO: access the weight as "get_pixel_weight(pixel_id)" - 
          # which queries database
          if "Signup" in new_name:
            weights_convs.append(0.05) 
          else:
            weights_convs.append(1)
        dfs_convs.insert(0, df_charges)
          
        return (dfs_convs, weights_convs)
        ## TODO - do we return a tuple - (dfs_convs, weights_convs), or assign into self?


    # given various sizes, make sure that the "num_conversions" field is being 
    # set properly
    # 1. test case when the only type of conversion is a Signup conversion:
    ## (weights_convs[0] != 1)
    # 2. 306383 has example of two
    def add_num_conversions(self,dfs_convs, weights_convs):
        
        ## TODO - from above, need to pull dfs_convs, weight_convs from self, or arguments
        df_full = pd.concat(dfs_convs, axis=1).fillna(0)
        # make sure that we're properly weighting by exactly 1
        if len(weights_convs) == 1:
          weights_convs[0] = 1

        # get a proxy for number of conversions (exact num if only one type of conversion)
        df_full['num_conversions'] = df_full.ix[:,6:].dot(weights_convs)    
        return df_full

    def add_cpm_columns(self, df, advertiser_id, target_cpa=-1):

        df_full = df.copy()
        # add CPA column - how much it costed rockerbox for each type of (proxied) 
        # conversion
        df_full['cpa'] = df_full['media_cost'] / df_full['num_conversions']

        # add CPA_charged column - analogous for cost to client
        df_full['cpa_charged'] = df_full['charged_client'] / df_full['num_conversions']        

        # if second parameter specified, then use that as the target CPA
        # TODO - read from the database to figure out what the target_CPA should be
        if not hasattr(self, 'goal_df'):
          self.goal_df = self.my_db.select(GOAL_TARGETS).as_dataframe()
          self.goal_df = self.goal_df.set_index('external_advertiser_id')
        
        goal_multiplier = self.goal_df['goal_cpm_multiplier'][advertiser_id]
        goal_cpa = self.goal_df['goal_target_cpa'][advertiser_id]

        #if target_cpa != -1:
        #  try:
        #    target_cpa_charged = float(target_cpa)
        #  except:
        #    print "need integer 2nd parameter"
        #    sys.exit(1)
        # otherwise, do the rolling average (up to 3)

        if isinstance(goal_cpa, float) and not math.isnan(goal_cpa):
          target_cpa_charged = goal_cpa
        elif isinstance(goal_multiplier, float) and not math.isnan(goal_multiplier):
          target_cpa_charged = goal_multiplier * df_full['cpa'][df_full.index[-1]]
        else:
          tail_length = 3
          
          # only one week's worth of data is available
          if len(df_full) == 1:
            print "no historical data to propose target CPA - please manually provide"
            sys.exit(0)

          # the historical data provided is too far in the past - force input
          if (df_full.index[-1] - df_full.index[-2]).days / 7 > 4:
            print "historical data is too far in the past to propose target CPA - please manually provide"
            sys.exit(0)
          if len(df_full) < 4:
            tail_length = len(df_full) - 1

          target_cpa_charged = sum(df_full['cpa_charged'][(-1 - tail_length):-1]) / tail_length


        # "fill in" correct cpa_charged
        df_full['cpa_charged'][df_full.index[-1]] = target_cpa_charged
        if (df_full['cpa'][df_full.index[-1]] == float('inf')):
          df_full['cpa'][df_full.index[-1]] = 0

        # print df_full.copy(), df_full['cpa_charged'][df_full.index[-1]], "---------", df_full.index[-1]
      
        # "fill in" CPM and CPM_charged
        df_full['cpm'] = df_full['media_cost'] / df_full['impressions'] * 1000
        df_full['cpm_charged'] = df_full['cpa_charged'] / df_full['cpa'] * df_full['cpm']       

        if not hasattr(self, 'unknown'):
          self.unknown = self.my_db.select(UNKNOWN_INTRAWEEK_ADVERTISERS).as_dataframe().values

        if not advertiser_id in self.unknown:
          df_full['cpm_multiplier'].iloc[-1] = df_full['charged_client'].iloc[-1] / df_full['media_cost'].iloc[-1]

        #print df_full.copy()
        return df_full

    def adjust_charge_client(self, df):
        
        df_full = df.copy()

        # add a multiplier column (charged / cost)
        df_full['multiplier'] = df_full['cpm_charged'] / df_full['cpm']
  
        # if number of conversions is 0, project charge_client according to specified 
        # rules

        our_multiplier = df_full['cpm_multiplier'].iloc[-1]
        multiplier = df_full['multiplier'].iloc[-1]

        # print df_full

        # TODO - for vanguard, getting this junk 13.7 value, want something lower - how to get?
        if df_full['num_conversions'].iloc[-1] == 0 or our_multiplier == 0:
          if our_multiplier == 0:
            our_multiplier = 1
          df_full['charged_client'].iloc[-1] = df_full['charged_client'].iloc[-1] + our_multiplier * df_full['base_cost'].iloc[-1]
          df_full['cpm_charged'].iloc[-1] = our_multiplier * df_full['cpm'].iloc[-1]
          df_full['multiplier'].iloc[-1] = df_full['cpm_charged'].iloc[-1] / df_full['cpm'].iloc[-1]
        else:
          # df_full['charged_client'].iloc[-1] = multiplier * df_full['media_cost'].iloc[-1]
          df_full['charged_client'].iloc[-1] = df_full['charged_client'].iloc[-1] + multiplier * df_full['base_cost'].iloc[-1]

        return df_full

    def finishing_formats(self, df):

        df_full = df.copy()
       
        # arrange column order
        df_full = df_full.drop(['num_conversions', 'cpm_multiplier'], axis=1)
        cols = df_full.columns.tolist()

        reorder_cols = ['impressions', 'clicks', 'media_cost', 'charged_client', 'cpm','cpm_charged','multiplier']        
        reorder_cols = reorder_cols + cols[5:-3] # contains the conversion columns (unknown number), cpa, cpa_charged
       
 
        # this is unclear what the order will be -- not clear at all what the order will be
        # new_cols = cols[0:4] + cols[-3:] + cols[4:-3]

        df_full = df_full[reorder_cols]
        df_full = df_full.reindex(df_full.index.rename('week_starting'))

        return df_full


