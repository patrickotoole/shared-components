from decorators import *
from queries import *

class IntraWeekBase(object):
    """
    These are classmethods that we will use in various places throughout
    the IntraWeek. 

    This will be the base for other operations for the intraweek analysis.
    """

    @classmethod
    @property_checker_threeargs
    def get_id(self, dates, advertiser_id):
        return dates['id'][advertiser_id]

    @classmethod
    @property_checker_threeargs
    def get_days_into_campaign(cls, dates, advertiser_id):
        # get days into campaign
        # what datatype is dates
        return dates['days_into_campaign'][advertiser_id]

    @classmethod
    @property_checker_threeargs
    def get_current_start_date(cls, dates, advertiser_id):
        # get current start date
        # what datatype is dates
        return dates['actual_start_date'][advertiser_id]

    @classmethod
    @property_checker_threeargs
    def get_end_date_proposed(cls, dates, advertiser_id):
        # get end_date_proposed
        # what is dates
        return dates['end_date_proposed'][advertiser_id]

    @classmethod
    @property_checker_threeargs
    def get_proposed_campaign_length(cls, dates, advertiser_id):
        # get proposed campaign length
        # what is dates
        return dates['proposed_campaign_length'][advertiser_id]



class IntraWeekDB(IntraWeekBase):
    """
    IntraWeekDB handles our database calls. These are small manipulations on 
    top of raw data that puts our dataset into a format where we can transform
    it in a standard way using specific methods.

    TODOS: 
      - doc strings
      - tests around the methods
      - can these be properties rather than methods?

    """

    def __init__(self,db_wrapper):
        self.my_db = db_wrapper

    def get_date_from_yearweek(self, yearweek):
        sunday = '%d Sunday' % yearweek
        _format = r'%X%V %W'
        date_info = self.my_db.select_dataframe(DATE_INFO % (sunday, _format))
        return str(date_info.ix[0][0])

    def get_pixel_name(self, pixel_id):
        if not hasattr(self, "pixel_info"):
            self.pixel_info = self.my_db.select_dataframe(PIXEL_INFO)

        mask = self.pixel_info['pixel_id'] == pixel_id

        return self.pixel_info[mask]['pixel_display_name'].iloc[0]

    # get the "most reasonable-looking budget" -> next budget cap to consider
    def get_budget(self, advertiser_id, money_spent):
      if not hasattr(self, 'budget_df'):
        self.budget_df = self.my_db.select(BUDGET).as_dataframe()

      mask = self.budget_df['external_advertiser_id'] == advertiser_id
      cum_budget_df = self.budget_df[mask].cumsum()

      for idx in range(len(cum_budget_df)):
        current_budget = cum_budget_df['budget'][cum_budget_df.index[idx]]
        if (current_budget >= money_spent):
          return (
            current_budget, 
            self.budget_df['budget'][cum_budget_df.index[idx]], 
            self.budget_df['id'][cum_budget_df.index[idx]]
          )
      
      # else, there are no campaigns remaining, just return money_spent
      return (-1, -1, -1)

    def get_recent_spent(self, advertiser_id):
      if not hasattr(self, 'recent_spent'):
         self.recent_spent = self.my_db.select(RECENT_SPEND).as_dataframe()

      try:
        mask = self.recent_spent['external_advertiser_id'] == advertiser_id
        recent_media_cost = self.recent_spent[mask]['media_cost'].iloc[0]
      except:
        recent_media_cost = 0

      return recent_media_cost
     
    # get advertiser name
    @property_checker_twoargs
    def get_advertiser_name(self, advertiser_id):
      if not hasattr(self, 'names_df'):
        self.names_df = self.my_db.select(ADVERTISER_NAME).as_dataframe()
      
      mask = self.names_df['external_advertiser_id'] == advertiser_id
      return self.names_df[mask]['advertiser_name'].iloc[0]

    def pull_charges(self, num_advertiser):
       
        if not hasattr(self, 'charges'):
            self.charges =  self.my_db.select(CHARGES).as_dataframe()
            self.charges = self.charges.set_index('wk_no')
        
        mask = self.charges['external_advertiser_id'] == num_advertiser
        df_charges = self.charges[mask] 

        return df_charges.drop('external_advertiser_id', axis=1)

    def active_advertisers(self):
        id_df = self.my_db.select('select external_advertiser_id from advertiser where active=1 and deleted=0;').as_dataframe()
        return id_df['external_advertiser_id'].tolist()
