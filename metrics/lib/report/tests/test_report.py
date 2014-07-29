import os
from twisted.trial import unittest
from lib.report.common import get_report_obj

CUR_DIR = os.path.realpath(__file__)
DOMAIN = 'domain'


class ReportTestCase(unittest.TestCase):
    def test_get_report_obj(self):
        obj = get_report_obj('domain')
        expected = obj._name
        self.assertEqual(expected, 'domain')

    def test_report_domain(self):
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

    def test_report_datapulling(self):
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/datapulling349923.csv')
        obj = get_report_obj('datapulling')
        resp = obj.get_report(
                path=csv_path,
                limit=10,
                )
        expected = {0: 47, 1: 138, 2: 155, 3: 595, 4: 283, 5: 42, 6: 100, 7: 66, 8: 1, 9: 12}
        response = resp.to_dict().get('imps')
        self.assertEqual(expected, response)
