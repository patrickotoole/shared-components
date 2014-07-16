#! /usr/bin/python
#

from pandas import *
import pandas as pd
import sys
from link import lnk
import math

## Lets define a class that takes in the database wrapper

# class Intraweek(object):
class Intraweek:
    def __init__(self,db_wrapper):
        self.my_db = db_wrapper 
        # assign db_wrapper to my_db
    
    def pull_1(self):
        ## Anytime we access the database, have a wrapper function for the request
        ## use the mysql wrapper here
        ## Lets add methods that make use the wrapper to pull back data

        # self.data = db.select()
        # return self.data
        pass
    
    def get_date_from_yearweek(self, yearweek):
        sunday = '%d Sunday' % yearweek
        format = r'%X%V %W'
        date_info = self.my_db.select("select STR_TO_DATE('%s', '%s')" % (sunday, format)).as_dataframe()
        return str(date_info.ix[0][0])

    def get_pixel_name(self, pixel_id):
        pixel_info = self.my_db.select('select pixel_display_name from advertiser_pixel where pixel_id = (%d)' % pixel_id).as_dataframe()
        return pixel_info.ix[0][0]

    def property_checker_twoargs(func):
        def wrapper(arg1, arg2):
          try:
            return func(arg1, arg2)
          except (KeyError, IndexError):
            return -1
        return wrapper

    def property_checker_threeargs(func):
        def wrapper(arg1, arg2, arg3):
          try:
            return func(arg1, arg2, arg3)
          except (KeyError, IndexError):
            return -1
        return wrapper

    def property_checker_onearg(func):
        def wrapper(arg1):
          try:
            return func(arg1)
          except (KeyError, IndexError):
            return -1
        return wrapper

    @property_checker_threeargs
    def get_current_multiplier(self, advertiser_id, target_cpa):
      week_df = self.get_table(advertiser_id, target_cpa)
      return week_df['multiplier'][week_df.index[-1]]

    @property_checker_twoargs
    def get_current_clientcharge(self, advertiser_id):
      week_df = self.get_table(advertiser_id, -1)
      return week_df['charged_client'][week_df.index[-1]]

    @property_checker_twoargs
    def get_historical_charge(self, advertiser_id):
      # TODO - need to ensure that the current_week is excluded
      budget_info = self.my_db.select('select sum(media_cost*cpm_multiplier) as charged_client from v3_reporting where external_advertiser_id=(%d) and active=1 and deleted=0;' % advertiser_id).as_dataframe()
      return budget_info[0][0]

    # get money used so far
    @property_checker_twoargs
    def get_cumulative_clientcharge(self, advertiser_id):
      week_df = self.get_table(advertiser_id, -1)
      return sum(week_df['charged_client'])

    # get the "most reasonable-looking budget" -> next budget cap to consider
    def get_budget(self, advertiser_id, money_spent):
      budget_df = self.my_db.select('select budget from insertion_order where external_advertiser_id = (%d);' % advertiser_id).as_dataframe()
      cum_budget_df = budget_df.cumsum()
      for idx in range(len(cum_budget_df)):
        current_budget = cum_budget_df['budget'][idx]
        if (current_budget > money_spent):
          return (current_budget, budget_df['budget'][idx])

    # wrapper
    def get_dollars_remaining(self, advertiser_id):
      money_spent = self.get_cumulative_clientcharge(advertiser_id)
      return self.get_budget(advertiser_id, money_spent) - money_spent

    # get days into campaign
    @property_checker_twoargs
    def get_days_into_campaign(self, advertiser_id):
      diff_df = self.my_db.select('select timestampdiff(DAY,actual_start_date,NOW()) as diff from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL;' % advertiser_id).as_dataframe()
      return diff_df.ix[0][0]

    # get current start date
    @property_checker_twoargs
    def get_current_start_date(self, advertiser_id):
      diff_df = self.my_db.select('select actual_start_date from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL;' % advertiser_id).as_dataframe()
      return diff_df.ix[0][0]

    # get end_date_proposed
    @property_checker_twoargs
    def get_end_date_proposed(self, advertiser_id):
      diff_df = self.my_db.select('select end_date_proposed from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL;' % advertiser_id).as_dataframe()
      return diff_df.ix[0][0]

    # get proposed campaign length
    @property_checker_twoargs
    def get_proposed_campaign_length(self, advertiser_id):
      length_df = self.my_db.select('select timestampdiff(DAY,start_date_proposed, end_date_proposed) as diff from insertion_order where external_advertiser_id = (%d) and actual_end_date IS NULL' % advertiser_id).as_dataframe()
      return length_df.ix[0][0]

    # get advertiser name
    @property_checker_twoargs
    def get_advertiser_name(self, advertiser_id):
      advertiser_row = self.my_db.select('select advertiser_name from advertiser where external_advertiser_id=(%d)' % advertiser_id).as_dataframe()
      advertiser_name = advertiser_row.ix[0][0]
      return advertiser_name

    def determine_pacing(self, row):
      ratio = row['expected_length'] / row['proposed_end_date_length']
      if ratio < 1.5:
        return "!"
      elif ratio < 3:
        return "!!"
      else:
        return "!!!"

    def get_advertiser_info(self, advertiser_id):
 
        advertiser_name = self.get_advertiser_name(advertiser_id)
        if (advertiser_name == -1):
          return pandas.DataFrame(["Advertiser DNE"])
        money_spent = self.get_cumulative_clientcharge(advertiser_id)
        budget_tuple = self.get_budget(advertiser_id, money_spent)
        current_budget = budget_tuple[1]
        current_remaining = budget_tuple[0] - money_spent
        current_spent = current_budget - current_remaining
        dollars_remaining = self.get_dollars_remaining(advertiser_id)
        days_into_campaign = self.get_days_into_campaign(advertiser_id)
        dollars_per_day = current_spent / days_into_campaign
        expected_campaign_length = current_budget / dollars_per_day
        proposed_campaign_length = self.get_proposed_campaign_length(advertiser_id)
        current_start_date = self.get_current_start_date(advertiser_id) 
        end_date_proposed = self.get_end_date_proposed(advertiser_id)

        map = { 'advertiser': [advertiser_name],
                'id': [advertiser_id],
                'start_date': [current_start_date],
                'end_date': [end_date_proposed],
                'current_budget': [current_budget], 
                'spent': [current_spent], 
                'remaining': [current_remaining], 
                # 'days_into_campaign': [days_into_campaign], 
                'days_left': [int(expected_campaign_length) - days_into_campaign],
                '$_per_day': [dollars_per_day], 
                'monthly_pacing': [30 * dollars_per_day],
                'expected_length': [expected_campaign_length],
                'expected_end_date': [DateOffset(days=int(expected_campaign_length)) + current_start_date], 
                 'proposed_end_date_length': [proposed_campaign_length]
                }
        advertiser_df = DataFrame(map)
        advertiser_df['pacing'] = advertiser_df.apply(self.determine_pacing, axis=1)
        return advertiser_df[['advertiser',
                              'id', 
                             'start_date',
                             'end_date', 
                             'proposed_end_date_length',
                             'expected_end_date',
                             'expected_length',
                             'days_left',
                             'current_budget',
                             'spent',
                             'remaining',
                             '$_per_day',
                             'monthly_pacing',
                             'pacing']]

    #########################
  
    def update_advertiser_targets(self,advertiser_id):
        # get the cpa target of the advertiser currently
        cpa_target = self.my_db.select('select target_cpa from intraweek where external_advertiser_id = (%d)' % advertiser_id).as_dataframe()
        target = cpa_target.ix[0][0]
        if target == None:
          new_target = -1
        else:
          new_target = target

        # get corresponding multiplier (and new target cpa, if applicable)
        ad_table = self.get_table(advertiser_id, new_target)
        multiplier = ad_table['multiplier'][ad_table.index[-1]]
        cpa_charged = ad_table['cpa_charged'][ad_table.index[-1]]

        # update table accordingly
        # self.my_db.execute('update intraweek set deleted=0, cpm_multiplier=%f,target_cpa=%f where external_advertiser_id=%d;' % (multiplier, cpa_charged, advertiser_id))
        self.my_db.execute('insert into intraweek (external_advertiser_id, cpm_multiplier, target_cpa) values (%d, %f, %f) on duplicate key update cpm_multiplier = %f, target_cpa = %f' % (advertiser_id, multiplier, cpa_charged, multiplier, cpa_charged))
        self.my_db.commit()


    def get_compiled_pacing_reports(self):
        ids = [225133, 250058, 274802, 302568, 306383, 338003, 312933]
        pacing_reports = []
        for id in ids:
          pacing_reports.append(self.get_advertiser_info(id))

        compiled_pacing = pandas.concat(pacing_reports)

        return compiled_pacing

    def get_advertiser_table(self,advertiser_id, num_rows):
        if (num_rows < 1):
          num_rows = 4
        return self.get_table(advertiser_id, -1).ix[- (num_rows):]

    #############################

    def get_table(self,advertiser_id, target_cpa):
        
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
        self.df_full = self.add_cpa_columns(self.df_full)
        self.df_full = self.add_cpm_columns(self.df_full, target_cpa)
        self.df_full = self.adjust_charge_client(self.df_full)
        self.df_full = self.finishing_formats(self.df_full)
    
        return self.df_full

    def pull_charges(self, num_advertiser):
        df_charges = self.my_db.select('select yearweek(date_add(date,interval -4 hour)) as wk_no,sum(imps) as Impressions,sum(clicks) as Clicks,sum(media_cost) as Media_Cost,sum(media_cost*cpm_multiplier) as Charged_Client,cpm_multiplier from v3_reporting where external_advertiser_id =(%d) and active=1 and deleted=0 group by 1 order by 1 asc;' % num_advertiser).as_dataframe()
        df_charges = df_charges.set_index('wk_no')

        return df_charges

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
            df_charges['charged_client'][df_charges.index[week_idx]] = df_charges['media_cost'][df_charges.index[week_idx]]
        
        return df_charges              

    def pull_conversions(self, num_advertiser):
        
        df_conversions = self.my_db.select('select yearweek(date_add(conversion_time,interval -4 hour)) as wk_no,pixel_id,sum(case when is_valid=1 then 1 else 0 end) as num_conversions from conversion_reporting where external_advertiser_id =(%d) and active=1 and deleted=0 group by 1,2 order by 1 asc;' % num_advertiser ).as_dataframe()
        return df_conversions  

    # Testing inputs:
    # vary the number of conversion types that you have - 1, 2, 3 distinct conversions
    # will need to poke through DBs to figure out a unique set
    def make_weight_lists(self, df_charges, df_conversions):
        
        # make a list of dataframes/weights containing corresponding to each distinct pixel_id (Signup and Purchase)
        dfs_convs = []
        weights_convs = []
        for pixel_id in set(df_conversions['pixel_id']):
          to_add = df_conversions[df_conversions['pixel_id'] == pixel_id].set_index('wk_no')
          new_name = self.get_pixel_name(pixel_id) + " conversions"
          to_add = to_add.rename(columns={'num_conversions': new_name })
          to_add = to_add.drop('pixel_id', axis=1)
          dfs_convs.append(to_add)
          
          # assign weights, hard-coded here
          # TODO: access the weight as "get_pixel_weight(pixel_id)" - which queries database
          if "Signup" in new_name:
            weights_convs.append(0.05) 
          else:
            weights_convs.append(1)
          dfs_convs.insert(0, df_charges)
          
          return (dfs_convs, weights_convs)
        ## TODO - do we return a tuple - (dfs_convs, weights_convs), or assign into self?

    # given various sizes, make sure that the "num_conversions" field is being set properly
    # 1. test case when the only type of conversion is a Signup conversion (weights_convs[0] != 1)
    # 2. 306383 has example of two
    def add_num_conversions(self,dfs_convs, weights_convs):
        
        ## TODO - from above, need to pull dfs_convs, weight_convs from self, or arguments
        df_full = pd.concat(dfs_convs, axis=1).fillna(0)
        # make sure that we're properly weighting by exactly 1
        if len(weights_convs) == 1:
          weights_convs[0] = 1

        # get a proxy for number of conversions (exact num if only one type of conversion)
        df_full['num_conversions'] = df_full.ix[:,5:].dot(weights_convs)    
        return df_full
       
     
    def add_cpa_columns(self, df):
        
        df_full = df.copy()
        # add CPA column - how much it costed rockerbox for each type of (proxied) conversion
        df_full['cpa'] = df_full['media_cost'] / df_full['num_conversions']

        # add CPA_charged column - analogous for cost to client
        df_full['cpa_charged'] = df_full['charged_client'] / df_full['num_conversions'] 
        return df_full

    def add_cpm_columns(self, df, target_cpa):

        df_full = df.copy()
 
        # if second parameter specified, then use that as the target CPA
        if target_cpa != -1:
          try:
            target_cpa_charged = float(target_cpa)
          except:
            print "need integer 2nd parameter"
            sys.exit(1)
        # otherwise, do the rolling average (up to 3)
        else:
          tail_length = 3
          
          # only one week's worth of data is available
          if len(df_full) == 1:
            print "no historical data to propose target CPA - please manually provide"
            sys.exit(0)

          # the historical data provided is too far in the past - force input
          if (df_full.index[-1] - df_full.index[-2]) > 4:
            print "historical data is too far in the past to propose target CPA - please manually provide"
            sys.exit(0)
          if len(df_full) < 4:
            tail_length = len(df_full) - 1

          target_cpa_charged = sum(df_full['cpa_charged'][(-1 - tail_length):-1]) / tail_length

        # "fill in" correct cpa_charged
        df_full['cpa_charged'][df_full.index[-1]] = target_cpa_charged

        # "fill in" CPM and CPM_charged
        df_full['cpm'] = df_full['media_cost'] / df_full['impressions'] * 1000
        df_full['cpm_charged'] = df_full['cpa_charged'] / df_full['cpa'] * df_full['cpm']

        return df_full

    def adjust_charge_client(self, df):
        
        # TODO = df.copy() elsewhere  
        df_full = df.copy()

        # if number of conversions is 0, project charge_client according to specified rules
        # TODO - save final df_full.index[-1] as variable
        last_idx = df_full.index[-1]
        our_multiplier = df_full['cpm_multiplier'][last_idx]
        if our_multiplier == 0: # then this week's charge will just equal the media cost
          df_full['charged_client'][last_idx] = df_full['media_cost'][last_idx]
          df_full['cpm_charged'][last_idx] = df_full['cpm'][last_idx]
        elif df_full['num_conversions'][last_idx] == 0:
          df_full['charged_client'][last_idx] = our_multiplier * df_full['media_cost'][last_idx]
          df_full['cpm_charged'][last_idx] = our_multiplier * df_full['cpm'][last_idx] 
        else:
          df_full['charged_client'][last_idx] = our_multiplier * df_full['media_cost'][last_idx]
       
        # add a multiplier column (charged / cost)
        df_full['multiplier'] = df_full['cpm_charged'] / df_full['cpm'] 
        return df_full

    def finishing_formats(self, df):
        df_full = df.copy()
        
        # arrange column order
        df_full = df_full.drop(['num_conversions', 'cpm_multiplier'], axis=1)
        cols = df_full.columns.tolist()
        new_cols = cols[0:4] + cols[-3:] + cols[4:-3]
        df_full = df_full[new_cols]
        # print df_full
        # print "multiplier:", df_full['multiplier'][df_full.index[-1]]
        
        # convert wk_no back to something to work with
        df_full['week_starting'] = df_full.index.map(self.get_date_from_yearweek)
        df_full = df_full.set_index('week_starting')
        return df_full

####################
    
    def maniputlate(self,df):
        transformed_Df = stuff(df)
        return transformed_df

        """
        ## Lets add the manipulation to another method
        df = df or self.data
        self.data = self.add_column(self.data)
        

        # directly modifies self.data
        # instance methods
        self.multi()
        # self.data has changed

        # indirectly modifies a dataframe
        # classmethods
        self.multi_2(self.data)
        # self.data has not changed

        pass
        """

    def multi(self):
        # this can operate directly on the data
        # self.multi()
        self.data = does_stuff(self.data)
        return self.data

    def multi_2(self,df):
        # depends on the result of multi 
        # self.multi_2(self.multi())
        return df
        
    
    def add_column(self,df):
        ## Lets break out the individual manipulation methods
        ## lets add tests for all these things
        return df
        pass

    def mutliplier_calcs(self):
        ## modify the dataframe to have the appropriate multiplier code
        pass
