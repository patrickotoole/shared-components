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
import logging

from lib.report.base import ReportBase
from lib.report.base import _get_or_create_console

from lib.report.utils.constants import GOOGLE_ADX
from lib.report.utils.constants import ADVERTISER_IDS
from lib.report.utils.constants import CONVERSIONS

LIMIT = 1


def _advertiser_to_pixels_mapping():
    console = _get_or_create_console()
    logging.info("getting pixel ids")
    res = console.get('/pixel')
    pixels = res.json.get("response").get("pixels")
    d = defaultdict(list)
    for p in pixels:
        if p.get('state') == 'active':
            d[str(p.get('advertiser_id'))].append(str(p.get('id')))
    return dict(d)

PIXELS_D = None
def _get_pixel_d():
    global PIXELS_D
    pixels_d = PIXELS_D or _advertiser_to_pixels_mapping()
    if not PIXELS_D:
        PIXELS_D = pixels_d
    return pixels_d

class ReportConversions(ReportBase):
    def get_report(self, *args, **kwargs):
        kwargs['group'] = CONVERSIONS
        return super(ReportConversions, self).get_report(*args, **kwargs)

    def _filter(self, df, *args, **kwargs):
        return df

    def _get_timedelta(self, lookback):
        return timedelta(hours=lookback)

    def _get_advertiser_ids(self):
        pixel_d = _get_pixel_d()
        return pixel_d.keys()

    def _get_pixel_ids(self, advertiser_id):
        global PIXELS_D
        pixels_d = PIXELS_D or _advertiser_to_pixels_mapping()
        if not PIXELS_D:
            PIXELS_D = pixels_d
        return pixels_d.get(advertiser_id)

def _analyze(df):
    pass
