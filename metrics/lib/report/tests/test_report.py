import os
import pandas as pd
from mock import patch
from link import lnk
from twisted.trial import unittest
from lib.report.common import get_report_obj
from lib.report.work.report import ReportWorker

from lib.pandas_sql import s as _sql

CUR_DIR = os.path.realpath(__file__)
DOMAIN = 'domain'
db = lnk.dbs.test

class ReportTestCase(unittest.TestCase):
    def test_get_report_obj(self):
        obj = get_report_obj('domain', db)
        expected = obj._name
        self.assertEqual(expected, 'domain')

    def test_report_domain(self):
        obj = get_report_obj('domain', db)
        metrics = 'best'
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/advertiser,site_domain.csv')
        result = obj.get_report(path=csv_path, metrics=metrics)

        expected = {2: 'LearnVest (195681)', 19: 'Dot & bo (306383)'}
        response = result.to_dict().get('advertiser')
        self.assertEqual(expected, response)

        expected = {2: 0.44381128571428574, 19: 0.87469199999999991}
        response = result.to_dict().get('cost_efficiency')
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

    def test_write_mysql_insert_query(self):
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/test2.csv')
        df = pd.read_csv(csv_path, index_col=True)
        cur = db.cursor()
        _cur = _sql._write_mysql(df, 'v4_reporting', df.columns.tolist(), cur)
        res = vars(_cur)
        expected_exe = "INSERT INTO v4_reporting (`date`,`line_item_id`,`campaign_id`,`creative_id`,`imps`,`clicks`,`media_cost`,`adx_spend`) VALUES ('2014-07-09 00:00:00',1037447,3657781,14654391,200,0,0.330013,0.13152) ON DUPLICATE KEY UPDATE v4_reporting.`date` = VALUES(v4_reporting.`date`),v4_reporting.`line_item_id` = VALUES(v4_reporting.`line_item_id`),v4_reporting.`campaign_id` = VALUES(v4_reporting.`campaign_id`),v4_reporting.`creative_id` = VALUES(v4_reporting.`creative_id`),v4_reporting.`imps` = VALUES(v4_reporting.`imps`),v4_reporting.`clicks` = VALUES(v4_reporting.`clicks`),v4_reporting.`media_cost` = VALUES(v4_reporting.`media_cost`),v4_reporting.`adx_spend` = VALUES(v4_reporting.`adx_spend`)"
        resp_exe = res.get('_executed')
        self.assertEqual(expected_exe, resp_exe)
