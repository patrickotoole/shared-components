"""
Hourly cron script that report/pull conversion data:
    advertiser_id
    pixel_id
    pixel_name
    line_item_id
    line_item_name
    campaign_id
    campaign_name
    creative_id
    creative_name
    pc (post
    order_id
    user_id
    auction_id
    imp_time
    conversion_time
     - last_activity
     - deleted
     - active
     - new_user
     - is_valid
     - notes
"""
from datetime import timedelta
from collections import defaultdict

from lib.report.base import ReportBase
from lib.report.base import _get_or_create_console

from lib.report.utils.constants import GOOGLE_ADX
from lib.report.utils.constants import ADVERTISER_IDS

LIMIT = 1


def _advertiser_to_pixels_mapping():
    console = _get_or_create_console()
    res = console.get('/pixel')
    pixels = res.json.get("response").get("pixels")
    d = defaultdict(list)
    for p in pixels:
        if p.get('state') == 'active':
            d[str(p.get('advertiser_id'))].append(str(p.get('id')))
    return dict(d)

PIXELS_D = None

class ReportConversions(ReportBase):

    def _filter(self, df, *args, **kwargs):
        return _analyze(df)

    def _get_timedelta(self, lookback):
        return timedelta(hours=lookback)

    def _get_advertiser_ids(self):
        return ADVERTISER_IDS

    def _get_pixel_ids(self, advertiser_id):
        global PIXELS_D
        pixels_d = PIXELS_D or _advertiser_to_pixels_mapping()
        if not PIXELS_D:
            PIXELS_D = pixels_d
        return pixels_d.get(advertiser_id)

def _analyze(df):
    grouped = df.groupby(['hour',
                          'advertiser_id',
                          'line_item_id',
                          'campaign_id',
                          'creative_id',
                          'seller_member',
                          ])
    res = grouped[['imps', 'clicks', 'media_cost']].sum()
    res = res.xs(GOOGLE_ADX, level="seller_member").reset_index()
    return res
