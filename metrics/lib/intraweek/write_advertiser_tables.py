#! /usr/bin/python
#
# Author: victor
# ----------------------------

import intraweek_update as iu
import pandas

if __name__ == "__main__":

  pandas.options.display.width = 1000
  iu.get_all_advertiser_tables()
