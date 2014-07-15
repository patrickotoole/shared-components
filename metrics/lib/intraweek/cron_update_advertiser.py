#! /usr/bin/python
#
# Author: victor
# - cronjob to write new cpm_multipliers and cpa_targets into 'intraweek' db
# - cpa_target should stay constant throughout the week, cpm_multiplier changes with media_cost
# ----------------------------

import intraweek_update as iu

if __name__ == "__main__":

  ids = [225133, 250058, 274802, 302568, 306383, 338003, 312933]

  for id in ids:
      
      print "Updating",iu.get_advertiser_name(id), "---------------------------"
      iu.update_advertiser_targets(id)
