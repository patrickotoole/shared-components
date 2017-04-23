from lib.helpers import decorators
from database import *


class SetupDeferred(SetupDatabase):


    @decorators.deferred
    def get_setup_data(self, advertiser_id):

        line_items = self.get_line_items(advertiser_id)
        media_plans = self.get_media_plan_endpoints(advertiser_id)
        yoshi_setup = self.get_yoshi_setup(advertiser_id)

        df = pd.merge(yoshi_setup, media_plans, left_on = 'mediaplan', right_on = 'name', how = 'inner')

        columns = ['external_advertiser_id','mediaplan', 'num_domains', 'line_item_name', 'active', 'endpoint']

        if len(df) > 0:
            df['external_advertiser_id'] = advertiser_id
            df = df[columns]

        data = {
            'setup': df.to_dict('records'),
            'line_items': line_items['line_item_name'].tolist(),
            'media_plans': media_plans['name'].tolist()

        }
        return data




