#! /usr/bin/python
#
# Author: victor
# - cronjob to write new cpm_multipliers and cpa_targets into 'intraweek' db
# - cpa_target should stay constant throughout the week, cpm_multiplier changes with media_cost
# ----------------------------

from intraweek_update import *
from link import lnk

if __name__ == "__main__":

  # ids = [225133, 250058, 274802, 302568, 306383, 338003, 312933]

  iw = Intraweek(lnk.dbs.rockerbox)
  ids = iw.active_advertisers()


  for id in ids:
      
      print "Updating",iw.get_advertiser_name(id), "---------------------------"
      try:
        iw.update_advertiser_targets(id)
      except:
        pass
