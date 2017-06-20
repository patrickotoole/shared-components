import pandas  as pd
import logging



REQUEST_URL = "/line-item?advertiser_id=%s"

class LineItemsAPI(object):

	def get_from_appnexus(self, advertiser_id):

		line_items = self.api.get_all_pages(REQUEST_URL%advertiser_id, "line-items")
		return pd.DataFrame(line_items)