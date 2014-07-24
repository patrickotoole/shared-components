import os
from twisted.trial import unittest
from twisted.test import proto_helpers
from lib.report.report_domain import _get_report_id, _get_report_url, get_report_helper
from lib.report.utils.utils import local_now
from lib.report.report_regular_data import report

CUR_DIR = os.path.realpath(__file__)


class ReportTestCase(unittest.TestCase):
    def test_get_report_resp(self):
        metrics = 'best'
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/advertiser,site_domain.csv')
        result = get_report_helper(path=csv_path, metrics=metrics)
        expected = {19235: 'Bigstock (225133)',
                    23825: 'Journelle (250058)',
                    23826: 'Journelle (250058)',
                    24977: 'Journelle (250058)',
                    25709: 'Journelle (250058)',
                    27281: 'Offset (274802)',
                    31349: 'BaubleBar (302568)',
                    31406: 'BaubleBar (302568)',
                    34908: 'Dot & bo (306383)',
                    35079: 'Dot & bo (306383)'}
        response = result.to_dict().get('advertiser')
        self.assertEqual(expected, response)

    def test_get_report_regular_data(self):
        start_date = '2014-07-24 17:25:04.786698-04:00'
        end_date = '2014-07-24 18:25:04.786698-04:00'
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/datapulling349923.csv')
        resp = report(
                path=csv_path,
                start_date=start_date,
                end_date=end_date,
                limit=100,
                )
        expected = {0: 799, 1: 2346, 2: 2635, 3: 10115, 4: 4811, 5: 714, 6: 1700, 7: 1122, 8: 17, 9: 204, 10: 153, 11: 17, 12: 391, 13: 17}
        response = resp.to_dict().get('imps')
        self.assertEqual(expected, response)
