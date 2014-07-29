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

from link import lnk

from lib.report.base import ReportBase
from lib.report.base import _get_or_create_console

from lib.report.utils.constants import CONVERSIONS
from lib.report.utils.constants import POST_CLICK
from lib.report.utils.utils import convert_datetime
from lib.report.utils.utils import memo
from lib.report.request_json_forms import CONVERSIONS_FORM

LIMIT = 1

PC = 'post_click_expire_mins'
PV = 'post_view_expire_mins'

@memo
def _get_pixels():
    console = _get_or_create_console()
    logging.info("getting pixel ids")
    res = console.get('/pixel')
    pixels = res.json.get("response").get("pixels")
    return pixels

def _advertiser_to_pixels_mapping():
    pixels = _get_pixels()
    d = defaultdict(list)
    for p in pixels:
        if p.get('state') == 'active':
            d[str(p.get('advertiser_id'))].append(str(p.get('id')))
    return dict(d)

def _is_valid(row):
    pid = row['pixel_id']
    window_hours = _get_pc_or_pv_hour(int(pid))
    window_hours = timedelta(window_hours.get('pc') if row['pc'] else
                             window_hours.get('pv'))
    conversion_time = convert_datetime(row['datetime'])
    imp_time = convert_datetime(row['imp_time'])
    row['is_valid'] = imp_time + window_hours <= conversion_time
    return row

def _get_pc_or_pv_hour(pid):
    dict_ = _get_pc_or_pv_hours()
    return dict_.get(pid)

@memo
def _get_pc_or_pv_hours():
    def _to_hour(mins):
        return mins / 60.
    pixels = _get_pixels()
    return dict((p.get('id'), dict(pc=_to_hour(p.get(PC)),
                                   pv=_to_hour(p.get(PV)))
                 ) for p in pixels)

class ReportConversions(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'conversions'
        self._table_name = 'conversion_reporting'
        super(ReportConversions, self).__init__(*args, **kwargs)

    def _filter(self, df, *args, **kwargs):
        df['pc'] = df['post_click_or_post_view_conv'] == POST_CLICK
        df['is_valid'] = 0
        df.apply(_is_valid, axis=1)
        return df

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
