from lib.report.reports.base import ReportBase

class ReportSegment(ReportBase):
    @property
    def require_external_advertiser_ids(self):
        return False

    @property
    def date_column(self):
        return 'date_time'
