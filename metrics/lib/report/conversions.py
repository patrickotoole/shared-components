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

from collections import defaultdict

from lib.report.base import ReportBase
from lib.report.analyze.report import analyze_conversions
from lib.report.analyze.report import get_pixels

from lib.report.request_json_forms import CONVERSIONS_FORM

LIMIT = 1

UNIQUE_KEYS = ["pixel_id",
               "line_item_id",
               "campaign_id",
               "creative_id",
               "order_id",
               "user_id",
               "auction_id",
               "datetime",
               ]

def _advertiser_to_pixels_mapping():
    pixels = get_pixels()
    d = defaultdict(list)
    for p in pixels:
        if p.get('state') == 'active':
            d[str(p.get('advertiser_id'))].append(str(p.get('id')))
    return dict(d)

class ReportConversions(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'conversions'
        self._table_name = 'conversion_reporting'
        super(ReportConversions, self).__init__(*args, **kwargs)

    def _analyze_helper(self, df, *args, **kwargs):
        return analyze_conversions(df)

    def _get_advertiser_ids(self):
        d_ = _advertiser_to_pixels_mapping()
        return d_.keys()

    def _get_pixel_ids(self, advertiser_id):
        d_ = _advertiser_to_pixels_mapping()
        return d_.get(advertiser_id)

    def _get_form_helper(self, *args, **kwargs):
        return CONVERSIONS_FORM

def _groupby(df):
    grouped = df.groupby(["pixel_id",
                          "pixel_name",
                          "line_item_id",
                          "line_item_name",
                          "campaign_id",
                          "campaign_name",
                          "creative_id",
                          "creative_name",
                          "order_id",
                          "user_id",
                          "auction_id",
                          "imp_time",
                          "datetime",
                          ])
    return grouped
