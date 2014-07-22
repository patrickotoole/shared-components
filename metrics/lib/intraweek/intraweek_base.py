from decorators import *
from queries import *

class IntraWeekBase(object):

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
      cum_budget_df = self.budget_df[self.budget_df['external_advertiser_id'] == advertiser_id].cumsum()
      for idx in range(len(cum_budget_df)):
        current_budget = cum_budget_df['budget'][cum_budget_df.index[idx]]
        if (current_budget >= money_spent):
          return (current_budget, self.budget_df['budget'][cum_budget_df.index[idx]], self.budget_df['id'][cum_budget_df.index[idx]])
      
      # else, there are no campaigns remaining, just return money_spent
      return (-1, -1, -1)

    def get_recent_spent(self, advertiser_id):
      if not hasattr(self, 'recent_spent'):
         self.recent_spent = self.my_db.select(RECENT_SPEND).as_dataframe()
     
      try: 
        recent_media_cost = self.recent_spent[self.recent_spent['external_advertiser_id'] == advertiser_id]['media_cost'].iloc[0] 
        recent_charged_client = recent_media_cost * self.get_current_multiplier(advertiser_id, -1)
      except IndexError:
        recent_media_cost = 0
        recent_charged_client = 0
     
      return recent_charged_client

    # get advertiser name
    @property_checker_twoargs
    def get_advertiser_name(self, advertiser_id):
      if not hasattr(self, 'names_df'):
        self.names_df = self.my_db.select(ADVERTISER_NAME).as_dataframe()
      
      return self.names_df[self.names_df['external_advertiser_id'] == advertiser_id]['advertiser_name'].iloc[0]


