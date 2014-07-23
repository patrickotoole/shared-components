import os
from twisted.trial import unittest
from twisted.test import proto_helpers
from lib.report.report import _get_report_id, _get_report_url, get_report, _to_list
from lib.report.utils import local_now

CUR_DIR = os.path.realpath(__file__)


TEST_JSON_REQUEST_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"2014-07-20 19:39:06","end_date":"2014-07-22 19:39:06.735234-04:00","columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/21\/2014","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

class ReportTestCase(unittest.TestCase):

    def test_get_report_url(self):
        id_ = _get_report_id(TEST_JSON_REQUEST_FORM)
        expected_url = 'report-download?id=' + id_
        url = _get_report_url(id_)
        self.assertEqual(expected_url, url)

    def test_get_report_resp(self):
        """
        python report.py --group=advertiser,site_domain --metrics=best --end=2014-07-01 --days=2 --act
        """
        end_date = '2014-07-01'
        days = 2
        metrics = 'best'
        csv_path = os.path.join(CUR_DIR, 'test_csv_files/advertiser,site_domain.csv')
        result_from_cached_csv_file = get_report(csv_path, metrics=metrics)
        result_from_api = get_report(
                group='advertiser,site_domain',
                end_date=end_date,
                days=days,
                metrics=metrics,
                )
        self.assertEqual(result_from_api.to_dict(), result_from_cached_csv_file.to_dict())
