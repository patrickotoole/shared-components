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
import logging

from collections import defaultdict

from lib.report.reports.base import ReportBase
from lib.report.analyze.report import get_pixels
from lib.report.utils.constants import CONVERSIONS_FORM
from lib.report.utils.reportutils import empty_frame
from lib.report.utils.reportutils import concat

LIMIT = 1

def _advertiser_to_pixels_mapping():
    pixels = get_pixels()
    d = defaultdict(list)
    for p in pixels:
        if p.get('state') == 'active':
            d[str(p.get('advertiser_id'))].append(str(p.get('id')))
    return dict(d)

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


class ReportConversions(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'conversions'
        self._table_name = 'v2_conversion_reporting'
        super(ReportConversions, self).__init__(*args, **kwargs)

    def _get_advertiser_ids(self):
        q = "select * from advertiser"
        df = self._db_wrapper.select_dataframe(q)
        return list(df[df.active==1].external_advertiser_id)

    def _get_pixel_ids(self, advertiser_id):
        d_ = _advertiser_to_pixels_mapping()
        return d_.get(advertiser_id)

    def _get_form_helper(self, *args, **kwargs):
        return CONVERSIONS_FORM

    def _get_dataframes(self, **kwargs):
        """
        kwargs
        ------------------------
        @param group:      : str
        @param start_date  : str
        @param end_date    : str
        @param limit       : int

        @return: Dataframe
        """
        dfs = []
        limit = kwargs.get('limit')
        for advertiser_id in self._get_advertiser_ids():
            _dfs = self._get_dataframe(advertiser_id, **kwargs)
            dfs.extend(_dfs)
            if limit and len(dfs) >= limit:
                return concat(dfs)
        return concat(dfs)

    def _get_dataframe(self, advertiser_id, **kwargs):
        """
        @param advertiser_id  : str
        @return: list(Dataframe)
        """
        #TODO make accounting know if pixel fails, currently the
        #get_dataframe return emptyframe when it not able to get
        #response
        to_return = []
        for pixel_id in self._get_pixel_ids(advertiser_id):
            kwargs.update(dict(pixel_id=pixel_id))
            df = super(ReportConversions, self)._get_dataframe(
                    advertiser_id, **kwargs)
            to_return.append(df)
        return to_return
