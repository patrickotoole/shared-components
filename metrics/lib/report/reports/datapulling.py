"""
cron script runs hourly to pull following data
    hour
    line_item_id  (new_field, compare to v3_reporting)
    campaign
    creative
    advertiser
    - Clicks
    - Imps
    - Media Cost
    adx_spend (new_field, compare to v3_reporting)

writing to database v4_reporting
"""

from lib.report.reports.base import ReportBase
from lib.report.utils.reportutils import get_advertiser_ids
from lib.report.utils.constants import DATA_PULLING_FORMS
from lib.report.utils.reportutils import concat


class ReportDataPulling(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'datapulling'
        self._table_name = 'v4_reporting'
        super(ReportDataPulling, self).__init__(*args, **kwargs)

    def _get_form_helper(self, *args, **kwargs):
        return DATA_PULLING_FORMS

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
        for advertiser_id in map(str, get_advertiser_ids()):
            df = self._get_dataframe(advertiser_id, **kwargs)
            dfs.append(df)
            if limit and len(dfs) >= limit:
                return concat(dfs)
        return concat(dfs)
