#! /usr/bin/python
#
# Author: victor
# - cronjob to write new cpm_multipliers and cpa_targets into 'intraweek' db
# - cpa_target should stay constant throughout the week, cpm_multiplier changes with media_cost
# ----------------------------

import intraweek_update as iu
import pandas

if __name__ == "__main__":

  pandas.options.display.width = 1000
  print iu.get_compiled_pacing_reports()
