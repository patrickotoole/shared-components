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

from lib.report.base import ReportBase
from lib.report.reportutils import get_advertiser_ids
from lib.report.request_json_forms import DATA_PULLING_FORMS


class ReportDataPulling(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'datapulling'
        self._table_name = 'v4_reporting'
        super(ReportDataPulling, self).__init__(*args, **kwargs)

    def _get_advertiser_ids(self):
        return map(str, get_advertiser_ids())

    def _get_form_helper(self, *args, **kwargs):
        return DATA_PULLING_FORMS
