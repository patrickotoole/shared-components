#! /usr/bin/python

from pandas import *
import pandas as pd
import sys
from link import lnk
import math
import datetime

from queries import *
from decorators import *
from intraweek_view import IntraWeekView

class Intraweek(IntraWeekView):

    def update_advertiser_targets(self,advertiser_id):
        """
        Writes most recent multiplier and target_cpa values to the intraweek
        database in a insert if not duplicate key format

        Note:
          Intended to be called via a cron-job, which updates cpm_multiplier
          daily as media_cost and number of conversions changes

        Args:
          advertiser_id: number corresponding to advertiser

        Returns:
          null
        """

        # get the cpa target of the advertiser currently
        cpa_target = self.my_db.select_dataframe(CPA_TARGET % advertiser_id)
        try:
          target = cpa_target.ix[0][0]
          if target == None:
            new_target = -1
          else:
            new_target = target
        except IndexError:
            new_target = -1

        # get corresponding multiplier (and new target cpa, if applicable)
        ad_table = self.get_table(advertiser_id, new_target)
        multiplier = ad_table['multiplier'][ad_table.index[-1]]
        cpa_charged = ad_table['cpa_charged'][ad_table.index[-1]]

        # manage nan entries
        print multiplier, cpa_charged
        if math.isnan(multiplier) or math.isinf(multiplier):
            multiplier = 1

        if math.isnan(cpa_charged) or math.isinf(cpa_charged):
            cpa_charged = 0

        # update table accordingly

        self.my_db.execute(
            UPDATE_CPA_TARGET %
            (advertiser_id, multiplier, cpa_charged, multiplier, cpa_charged)
        )
        self.my_db.commit()



if __name__ == "__main__":
    iw = Intraweek(lnk.dbs.mysql)
    print iw.get_compiled_pacing_reports()
    # print iw.get_table(306383,-1)


