import os
from twisted.trial import unittest
from twisted.test import proto_helpers
from lib.report.report_domain import _get_report_id, _get_report_url, get_report
from lib.report.utils.utils import local_now

CUR_DIR = os.path.realpath(__file__)


TEST_JSON_REQUEST_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"2014-07-20 19:39:06","end_date":"2014-07-22 19:39:06.735234-04:00","columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/21\/2014","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

class ReportTestCase(unittest.TestCase):

    def test_get_report_url(self):
        id_ = _get_report_id(TEST_JSON_REQUEST_FORM)
        expected_url = 'report-download?id=' + id_
        url = _get_report_url(id_)
        self.assertEqual(expected_url, url)

    def test_get_report_resp(self):
        metrics = 'best'
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/advertiser,site_domain.csv')
        result = get_report(path=csv_path, metrics=metrics)
        data = {'advertiser': {15168: 'Bigstock (225133)',
                               34242: 'BaubleBar (302568)',
                               34546: 'BaubleBar (302568)',
                               37145: 'Dot & bo (306383)',
                               37146: 'Dot & bo (306383)',
                               37160: 'Dot & bo (306383)',
                               37174: 'Dot & bo (306383)',
                               37245: 'Dot & bo (306383)',
                               37247: 'Dot & bo (306383)',
                               37279: 'Bonobos (312933)'}}
        expected_ad = data.get('advertiser')
        response_ad = result.to_dict().get('advertiser')
        self.assertEqual(expected_ad, response_ad)
