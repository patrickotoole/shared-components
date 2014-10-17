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
from lib.report.utils.constants import GEO_FORM


class ReportGeo(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'geo'
        self._table_name = 'v1_geo_reporting'
        super(ReportGeo, self).__init__(*args, **kwargs)

    def _get_form_helper(self, *args, **kwargs):
        return GEO_FORM

    def _get_dataframes(self, **kwargs):
        return self._get_dataframe(**kwargs)
