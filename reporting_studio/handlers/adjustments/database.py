import pandas as pd 
import logging

MEDIATRADER = '''
SELECT media_trader_slack_name
FROM rockerbox.advertiser
WHERE external_advertiser_id = %s
'''


class DataBase(object):

	def get_media_trader(self, advertiser_id):
		df = self.db.select_dataframe(MEDIATRADER%advertiser_id)
		if len(df)>0:
			return df['media_trader_slack_name'].iloc[0]