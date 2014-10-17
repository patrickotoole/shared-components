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

from lib.report.reports.base import ReportBase
from lib.report.utils.constants import CONVERSIONS_FORM
from lib.report.utils.reportutils import concat
from lib.report.utils.reportutils import get_advertiser_ids


class ReportConversions(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'conversions'
        self._table_name = 'v2_conversion_reporting'
        self._pixels = None
        super(ReportConversions, self).__init__(*args, **kwargs)

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
        for advertiser_id in get_advertiser_ids():
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
        pixel_ids = self._get_pixel_ids(advertiser_id)
        for pixel_id in pixel_ids:
            kwargs.update(dict(pixel_id=pixel_id))
            df = super(ReportConversions, self)._get_dataframe(
                    advertiser_id, **kwargs)
            to_return.append(df)
        return to_return

    def _get_pixel_ids(self, advertiser_id):
        return self.pixels.get(advertiser_id, [])

    @property
    def pixels(self):
        """
        return: dict(int(advertiser_id), list(int(pixel_id))
        """
        if not self._pixels:
            df = self._db_wrapper.select_dataframe('select * from advertiser_pixel')
            d_ = {s[0]: s[1].T.to_dict() for s in df.groupby('external_advertiser_id')}
            self._pixels = {k:[s.get('pixel_id') for s in v.values()]
                            for k,v in d_.iteritems()}
        return self._pixels

    def _get_form_helper(self, *args, **kwargs):
        return CONVERSIONS_FORM
