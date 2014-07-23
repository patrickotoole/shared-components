from pandas import *
import pandas as pd
import sys
from link import lnk
import math
import datetime

from queries import *
from decorators import *
from intraweek_table import IntraWeekTable

class IntraWeekView(IntraWeekTable):
    """
    This is the view of the IntraWeekTable. The table gets constructed behind 
    the scenes and this is how we interact with it.
    """

    def __init__(self,db_wrapper):
        self.my_db = db_wrapper 

    def get_recent_charged(self, advertiser_id):
      try:
        recent_media_cost = self.get_recent_spent(advertiser_id)
        multiplier = self.get_current_multiplier(advertiser_id, -1)

        recent_charged_client = recent_media_cost * multiplier
      except IndexError:
        recent_media_cost = 0
        recent_charged_client = 0
     
      return recent_charged_client

    @property_checker_threeargs
    def get_current_multiplier(self, advertiser_id, target_cpa):
      week_df = self.get_table(advertiser_id, target_cpa)
      return week_df['multiplier'][week_df.index[-1]]

    @property_checker_twoargs
    def get_current_clientcharge(self, advertiser_id):
      week_df = self.get_table(advertiser_id, -1)
      return week_df['charged_client'][week_df.index[-1]]

    # get money used so far
    @property_checker_twoargs
    def get_cumulative_clientcharge(self, advertiser_id):
      week_df = self.get_table(advertiser_id, -1)
      return sum(week_df['charged_client'])

    # get average amount spent in past weeks
    @property_checker_twoargs
    def get_average_spent_twoweeks(self, advertiser_id):
      week_df = self.get_table(advertiser_id, -1)
      spent = sum(week_df['charged_client'].iloc[-2:])

      # one full week, then number of days this week
      days = 7 + ((1 + datetime.datetime.today().weekday()) % 7) 
      return spent / days

    def determine_pacing(self, row):
      try:
        ratio = row['expected_length'] / row['proposed_end_date_length']
        if ratio < 1.5:
          return "!"
        elif ratio < 3:
          return "!!"
        else:
          return "!!!"
      except ZeroDivisionError:
        return "-"

    # (spend, budget, computations)
    def read_advinfo_from_db(self, advertiser_id):

        self.advertiser_name = self.get_advertiser_name(advertiser_id)
        if (self.advertiser_name == -1):
          return pandas.DataFrame(["Advertiser DNE"])
        
        # getting budget information
        self.money_spent = self.get_cumulative_clientcharge(advertiser_id) # 2.34s
        budget_tuple = self.get_budget(advertiser_id, self.money_spent)
        
        self.campaign_id = budget_tuple[2]
        if (self.campaign_id == -1):
          self.current_budget = 0
          self.current_remaining = 0
          self.current_spent = 0
        else:
          self.current_budget = budget_tuple[1]
          self.current_remaining = budget_tuple[0] - self.money_spent
          self.current_spent = self.current_budget - self.current_remaining      

        # getting most recent day's spent information
        self.yesterday_spent = self.get_recent_charged(advertiser_id)
        # self.yesterday_spent = 0 

        # getting date/calendar information
        if not hasattr(self, 'dates'):
          self.dates = self.my_db.select(IO_DATES).as_dataframe()
          self.dates = self.dates.set_index('external_advertiser_id')
        
        self.perceived_campaign_id = self.get_id(self.dates, advertiser_id)

        self.days_into_campaign = self.get_days_into_campaign(self.dates, advertiser_id)
        self.proposed_campaign_length = self.get_proposed_campaign_length(self.dates, advertiser_id)
        self.current_start_date = self.get_current_start_date(self.dates, advertiser_id)
        self.end_date_proposed = self.get_end_date_proposed(self.dates, advertiser_id)
        self.dollars_per_day_last_sunday = self.get_average_spent_twoweeks(advertiser_id)    
 
    def transform_columns(self):

        ##
        ## RICK: lets define local variables for things what we will reuse
        ## alot within the function
        ## ex. spend = self.current_spent
        ##

        self.dollars_per_day = self.current_spent / self.days_into_campaign
        self.expected_campaign_length = self.current_budget / self.dollars_per_day
        self.shouldve_spent = self.current_budget / self.proposed_campaign_length * self.days_into_campaign

        ##
        ## RICK:
        ## I cant follow this easily, give me a function for this
        ## provide functions for things before we set values so we can explain 
        ## what the value is.
        ##
        ## Note: that the functions don't necessarily need to be part of the class
        ##

        if self.days_into_campaign != 0:
          self.dollars_per_day = self.current_spent / self.days_into_campaign
        else:
          self.dollars_per_day = 0

        if self.dollars_per_day != 0:
          self.expected_campaign_length = self.current_budget / self.dollars_per_day
        else:
          self.expected_campaign_length = 0

        if self.proposed_campaign_length != 0 and self.days_into_campaign != 0:
          self.shouldve_spent = float(self.current_budget) / self.proposed_campaign_length * self.days_into_campaign
        else:
          self.shouldve_spent = float(0)        


        if (self.shouldve_spent > self.current_budget):
          self.shouldve_spent = self.current_budget

        if (self.proposed_campaign_length - self.days_into_campaign) != 0:
          self.to_spend_per_day = self.current_remaining / (self.proposed_campaign_length - self.days_into_campaign)
          if (self.to_spend_per_day < 0): # expired campaign
            self.to_spend_per_day = 0
        else:
          self.to_spend_per_day = 0
        if (self.to_spend_per_day == float('inf')):
          self.to_spend_per_day = 0
        self.actual_days_left = (self.proposed_campaign_length - self.days_into_campaign)
    
    def display_advinfo(self, advertiser_id):
        ##
        ## RICK: clean this up with two tuples and the dict(zip())
        ## probably want to define the columns as a variable ADV_INFO_COLUMNS
        ## and reuse this columns list multiple times
        ## ex. dict(zip(columns,values))
        ##

        if self.campaign_id == self.perceived_campaign_id:
          map = { 'advertiser': [self.advertiser_name],
                  'id': [advertiser_id],
                  'start_date': [self.current_start_date],
                  'end_date': [self.end_date_proposed],
                  'current_budget': [self.current_budget],
                  'spent': [self.current_spent],
                  'remaining': [self.current_remaining],
                  # 'days_into_campaign': [days_into_campaign],
                  'expected_days_left': [int(self.expected_campaign_length) - self.days_into_campaign],
                  'dollars_per_day': [self.dollars_per_day],
                  'dollars_per_day_last_sunday': [self.dollars_per_day_last_sunday],
                  'monthly_pacing': [30 * self.dollars_per_day_last_sunday],
                  'expected_length': [self.expected_campaign_length],
                  'expected_end_date': [DateOffset(days=int(self.expected_campaign_length)) + self.current_start_date],
                  'proposed_end_date_length': [self.proposed_campaign_length],
                  'shouldve_spent_by_now': [self.shouldve_spent],
                  'to_spend_per_day': [self.to_spend_per_day],
                  'actual_days_left': [self.actual_days_left],
                  'yesterday_spent': [self.yesterday_spent]
                  }
        else:
          map = { 'advertiser': [self.advertiser_name],
                  'id': [advertiser_id],
                  'start_date': [self.current_start_date],
                  'end_date': [self.current_start_date],
                  'current_budget': [self.current_budget],
                  'spent': [self.current_spent],
                  'remaining': [self.current_remaining],
                  'expected_days_left': [0],
                  'dollars_per_day': [0],
                  'dollars_per_day_last_sunday': [0],
                  'monthly_pacing': [0],
                  'expected_length': [0],
                  'expected_end_date': [self.current_start_date],
                  'proposed_end_date_length': [0],
                  'shouldve_spent_by_now': [0],
                  'to_spend_per_day': [0],
                  'actual_days_left': [0],
                  'yesterday_spent': [self.yesterday_spent]
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
                             'expected_days_left',
                             'actual_days_left',
                             'current_budget',
                             'spent',
                             'remaining',
                             'dollars_per_day',
                             'dollars_per_day_last_sunday',
                             'monthly_pacing',
                             'pacing',
                             'shouldve_spent_by_now',
                             'to_spend_per_day',
                             'yesterday_spent']]

    def get_advertiser_info(self, advertiser_id):
        self.read_advinfo_from_db(advertiser_id)
        self.transform_columns()
        return self.display_advinfo(advertiser_id)

    def get_compiled_pacing_reports(self, ids=None):
        """        
        get_compiled_pacing_reports is called by the intraweek.py handler to 
        get a summary view of pacing for all active advertisers

        Note:
          Advertiser list is currently hard-coded, with an optional parameter
          yesterday_spent: yesterday's media_cost multiplied by this week's multiplier
          to_spend_per_day: expense per day in order to reach budget, given current spent
          shouldve_spent_by_now: how much of budget shouldve been spent, given days into campaign
          pacing: more exclamation marks/alerts when current spending is outpaced
          monthly_pacing: 30 times dollars_per_day_last_sunday (TODO - swap with dollars_per_day?)
          dollars_per_day_last_sunday: average amount spent since two Sundays ago (7-14 history)
          dollars_per_day: average amount spent on current campaign
          remaining: amount remaining in this campaign's budget
          spent: amount spent, going towards this campaign
          current_budget: budget of this current campaign
          actual_days_left: today's date compared to proposed end date
          expected_days_left: today's date compared to expected end date
          expected_length: expected length of campaign, given (dollars_per_day) spent
          expected_end_date: expected end date of campaign, given (dollars_per_day) spent
          proposed_end_date_length: proposed_end_date minus proposed_start_date, length of campaign
          end_date: end_date_proposed field of the campaign
          start_date: start_date_proposed field of the campaign
          id: external_advertiser_id of the advertiser

        Args:
          ids: Optional list of advertiser ids

        Returns:
          DataFrame containing pacing information for set of "active" ids corresponding to advertisers

        """

        if ids == None:
          ids = self.active_advertisers()
          #ids = [225133, 250058, 274802, 302568, 306383, 338003, 312933]
        pacing_reports = []
        for id in ids:
          try:
            to_append = self.get_advertiser_info(id)
            pacing_reports.append(to_append)
          except:
            continue
            

        compiled_pacing = pandas.concat(pacing_reports)

        return compiled_pacing

    def get_advertiser_table(self,advertiser_id, num_rows):
        """
        get_advertiser_table displays CPM/CPA/charge targets for a given "advertiser_id"

        Args:
          advertiser_id: numeric value corresponding to advertiser
          num_rows: number of recent weeks to display
    
        Returns:
          last "num_rows" weeks of multiplier/charge information for the given 
          "advertiser_id"

        """
        if (num_rows < 1):
            num_rows = 4

        table = self.get_table(advertiser_id, -1)
        return table.ix[- (num_rows):].sort(ascending=False).reset_index()

