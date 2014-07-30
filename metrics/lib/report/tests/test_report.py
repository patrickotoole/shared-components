import os
from link import lnk
from twisted.trial import unittest
from lib.report.common import get_report_obj
from lib.report.reportutils import get_default_db

CUR_DIR = os.path.realpath(__file__)
DOMAIN = 'domain'
db = get_default_db()

class ReportTestCase(unittest.TestCase):
    def test_get_report_obj(self):
        obj = get_report_obj('domain', db)
        expected = obj._name
        self.assertEqual(expected, 'domain')

    def test_report_domain(self):
        obj = get_report_obj('domain', db)
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
        obj = get_report_obj('datapulling', db)
        resp = obj.get_report(
                path=csv_path,
                limit=10,
                )
        expected = {0: 16932271, 1: 16932278, 2: 16932286, 3: 16932542, 4: 16932636, 5: 16932670, 6: 16932542, 7: 16932636, 8: 16932670, 9: 16932298}
        response = resp.to_dict().get('creative_id')
        self.assertEqual(expected, response)
