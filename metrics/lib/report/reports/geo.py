"""
cron script runs daily to pull geo data from appnexus
    "columns": [
        "advertiser",
        "day",
        "geo_dma",
        "geo_region",
        "imps",
        "clicks",
        "click_thru_pct",
        "total_convs",
        "convs_rate",
        "booked_revenue",
        "cost",
        "profit",
        "cpm"
    ],

writing to database v1_geo_reporting
"""

from lib.report.reports.base import ReportBase

class ReportGeo(ReportBase):
    @property
    def require_external_advertiser_ids(self):
        return False

    @property
    def date_column(self):
        return 'date'
