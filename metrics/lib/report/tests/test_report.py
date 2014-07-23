from twisted.trial import unittest
from twisted.test import proto_helpers
from reports.report import *
import os
import sys

CUR_DIR = os.path.realpath(__file__)

#not sure why these not working, will fix these paths
#PATH = os.path.join(CUR_DIR, '/../../')
#sys.path.append(PATH)
#sys.path.append(os.path.dirname(os.path.realpath(__file__)) + "/../../..")

TEST_JSON_REQUEST_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"2014-07-20 19:39:06","end_date":"2014-07-22 19:39:06.735234-04:00","columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/21\/2014","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

class ReportTestCase(unittest.TestCase):

    def _test_get_report_id(self):
        id_expected = 'de88e4e3e3ba811772bfc95f7c2f6019'
        id_ = _get_report_id(TEST_JSON_REQUEST_FORM)
        self.assertEqual(id_expected, id_)

    def _test_request_form(self):
        pass
        self.assertEqual()

    def _test_get_report(self):
        self.assertEqual()

    def _test_download_report(self):
        url = 'report-download?id=de88e4e3e3ba811772bfc95f7c2f6019'
        resp_expected = some
        resp = _download_report(url)
        self.assertEqual()

    def _test_report_id(self):
        pass
