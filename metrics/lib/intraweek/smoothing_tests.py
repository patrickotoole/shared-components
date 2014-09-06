#! /usr/bin/python
#
# Author: victor
# - select by days to determine a smoothed charged_client value
# ----------------------------

from intraweek_update import *
from link import lnk
import matplotlib.pyplot as plt

class SmoothCharges:

    def __init__(self, db_wrapper):
      self.my_db = db_wrapper

    def pull_daily_charges(self, num_advertiser):
        df_charges = self.my_db.select_dataframe('select date(date_add(date,interval -4 hour)) as date,sum(imps) as Impressions,sum(clicks) as Clicks,sum(media_cost) as Media_Cost,sum(media_cost*cpm_multiplier) as Charged_Client,cpm_multiplier from v3_reporting where external_advertiser_id =(%d) and active=1 and deleted=0 group by 1 order by 1 asc;' % num_advertiser)
        df_charges = df_charges.set_index('date')

        return df_charges

    # provides the cpm_multiplier, which we'll use to fill in charged_client for recent days
    def get_cpm_multiplier(self, advertiser_id):
        mult_df = self.my_db.select_dataframe('select cpm_multiplier from intraweek where external_advertiser_id = (%d)' % advertiser_id)
        return mult_df.ix[0][0]

   # fill in raw daily charges
    def fill_in_daily_charges(self, df_charges, multiplier):

        my_charges = df_charges.copy()
        for idx in range(len(my_charges)):
            old_multiplier = my_charges['cpm_multiplier'][my_charges.index[idx]]
            if old_multiplier == None or math.isnan(old_multiplier):
                my_charges['cpm_multiplier'][my_charges.index[idx]] = multiplier
                my_charges['charged_client'][my_charges.index[idx]] = multiplier * my_charges['media_cost'][my_charges.index[idx]]

        sc.my_charges = my_charges
        return my_charges

if __name__ == "__main__":
    sc = SmoothCharges(lnk.dbs.vluu_local)
    df_charges = sc.pull_daily_charges(225133)
    mult = sc.get_cpm_multiplier(225133)
    print sc.fill_in_daily_charges(df_charges, mult)
