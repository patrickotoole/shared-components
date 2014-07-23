import os
from twisted.trial import unittest
from twisted.test import proto_helpers
from lib.report.report import _get_report_id, _get_report_url, get_report
from lib.report.utils import local_now

CUR_DIR = os.path.realpath(__file__)


TEST_JSON_REQUEST_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"2014-07-20 19:39:06","end_date":"2014-07-22 19:39:06.735234-04:00","columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/21\/2014","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

class ReportTestCase(unittest.TestCase):

    def test_get_report_url(self):
        id_ = _get_report_id(TEST_JSON_REQUEST_FORM)
        expected_url = '/report?id=' + id_
        url = _get_report_url(id_)
        self.assertEqual(expected_url, url)

    def test_get_report_resp(self):
        start_date='2014-07-14 00:00:00'
        end_date='2014-07-15 00:00:00'
        result_from_cached_csv_file = get_report(cache=True)
        result_from_api = get_report(start_date=start_date, end_date=end_date)
        self.assertEqual(result_from_api, result_from_cached_csv_file)
