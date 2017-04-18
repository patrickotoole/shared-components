ADVERTISERS = '''
SELECT DISTINCT a.external_advertiser_id 
FROM rockerbox.advertiser a 
JOIN rockerbox.yoshi_setup b
ON (a.external_advertiser_id = b.external_advertiser_id)
WHERE a.active = 1 AND a.deleted = 0 AND a.running = 1 AND a.media = 1
AND b.active = 1
'''


class AutorunDatabase(object):

	def get_advertisers(self):
		df = self.db.select_dataframe(ADVERTISERS)
		advertisers = df['external_advertiser_id'].tolist()
		advertisers.sort()
		return advertisers
