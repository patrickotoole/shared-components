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

class ReportAnalytics(ReportBase):
    def _get_reports(self, external_advertiser_id=None, **kwargs):
        url = self.request_url() + str(external_advertiser_id)
        form = self.request_json_form()
        df = self._get_report(url, form)
        return df

    @property
    def date_column(self):
        return 'date'
