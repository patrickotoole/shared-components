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
from lib.report.analyze.report import analyze_datapulling
from lib.report.request_json_forms import DATA_PULLING_FORMS


class ReportDataPulling(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'datapulling'
        self._table_name = 'v4_reporting'
        super(ReportDataPulling, self).__init__(*args, **kwargs)

    def _analyze_helper(self, df, *args, **kwargs):
        return analyze_datapulling(df)

    def _get_advertiser_ids(self):
        return get_advertiser_ids()

    def _get_form_helper(self, *args, **kwargs):
        return DATA_PULLING_FORMS

    def _get_unique_table_key(self):
        return ['date',
                'external_advertiser_id',
                'line_item_id',
                'campaign_id',
                'creative_id',
                ]
