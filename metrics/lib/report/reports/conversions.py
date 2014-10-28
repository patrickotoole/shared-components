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
from lib.report.utils.constants import DEFAULT_DB
from lib.report.utils.reportutils import concat
from lib.report.utils.utils import memo

class ReportConversions(ReportBase):
    def _get_reports(self, external_advertiser_id=None, limit=None):
        dfs = []
        url = self.request_url() + str(external_advertiser_id)
        for pixel_id in self._get_pixel_ids(external_advertiser_id):
            form = self.request_json_form(pixel_id=pixel_id)
            df = self._get_report(url, form)
            if not len(df):
                continue
            dfs.append(df)
            if limit and len(dfs) >= limit:
                return concat(dfs)
        return concat(dfs)

    def _get_pixel_ids(self, advertiser_id):
        return self.pixels().get(advertiser_id, [])

    @property
    def date_column(self):
        return 'conversion_time'

    @memo
    def pixels(self):
        """
        return: dict(int(advertiser_id), list(int(pixel_id))
        """
        df = DEFAULT_DB().select_dataframe('select * from advertiser_pixel')
        d_ = {s[0]: s[1].T.to_dict() for s in df.groupby('external_advertiser_id')}
        return {k:[s.get('pixel_id') for s in v.values()] for k,v in d_.iteritems()}
