import os
from twisted.trial import unittest
from twisted.test import proto_helpers
from lib.report.report_domain import _get_report_id, _get_report_url, get_report_helper
from lib.report.utils.utils import local_now

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
