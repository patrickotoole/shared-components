import os
from twisted.trial import unittest
from twisted.test import proto_helpers
from lib.report.domain import ReportDomain
from lib.report.datapulling import ReportDataPulling
from lib.report.common import get_report_obj
from lib.report.utils.utils import local_now

CUR_DIR = os.path.realpath(__file__)
DOMAIN = 'domain'


class ReportTestCase(unittest.TestCase):
    def test_get_report_obj(self):
        obj = get_report_obj('domain')
        expected = obj.name
        self.assertEqual(expected, 'domain')

    def test_get_report_domain(self):
        obj = get_report_obj('domain')
        metrics = 'best'
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/advertiser,site_domain.csv')
        result = obj.get_report(limit=10, path=csv_path, metrics=metrics)
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

    def test_get_report_datapulling(self):
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/datapulling349923.csv')
        obj = get_report_obj('datapulling')
        resp = obj.get_report(
                path=csv_path,
                limit=10,
                )
        expected = {0: 799,1: 2346, 2: 2635, 3: 10115, 4: 4811, 5: 714, 6: 1700, 7: 1122, 8: 17, 9: 204}
        response = resp.to_dict().get('imps')
        self.assertEqual(expected, response)
