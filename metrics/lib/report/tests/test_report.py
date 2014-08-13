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
DROP = "drop table roclocaltest.v4_reporting;"
CREATE = """
    CREATE TABLE `v4_reporting` (
      `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
      `imps` int(10) NOT NULL,
      `clicks` int(10) NOT NULL,
      `campaign_id` int(10) NOT NULL,
      `creative_id` int(10) NOT NULL,
      `line_item_id` int(10) NOT NULL,
      `media_cost` decimal(20,10) NOT NULL,
      `adx_spend` decimal(20,10) DEFAULT '0.0000000000',
      `external_advertiser_id` int(10) DEFAULT NULL,
      `date` datetime DEFAULT NULL,
      `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      `deleted` tinyint(1) DEFAULT '0',
      `cpm_multiplier` decimal(5,2) DEFAULT NULL,
      `active` tinyint(1) DEFAULT '1',
      `notes` varchar(400) DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `unique` (`date`,`external_advertiser_id`,`campaign_id`,`creative_id`,`line_item_id`, `deleted`, `imps`, `clicks`, `media_cost`, `adx_spend`, `active`)
    )
"""

# we want to use the setup method of the test case
#db = lnk.dbs.test

class ReportTestCase(unittest.TestCase):

    def setUp(self):
        self.db = lnk.dbs.test
        try:
            self.db.execute(DROP)
        except:
            pass
        self.db.execute(CREATE)
        self.db.commit()

    def tearDown(self):
        self.db.execute(DROP)
        self.db.commit()

    def test_get_report_obj(self):
        obj = get_report_obj('domain', self.db)
        expected = obj._name
        self.assertEqual(expected, 'domain')

    def test_report_domain(self):
        obj = get_report_obj('domain', self.db)
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/advertiser,site_domain.csv')
        result = obj.get_report(path=csv_path, limit=10)
        expected = {
                0: 'realsimple.com',
                1: 'southernliving.com',
                2: 'trendir.com',
                3: 'sunset.com',
                4: 'mocoloco.com',
                5: 'bing.com',
                6: 'cityfeet.com',
                7: 'style-files.com',
                8: 'brainyquote.com',
                9: 'auctionzip.com'
                }
        response = result.to_dict().get('domain')
        self.assertEqual(expected, response)

        expected = {
                 0: 2.6200000000000001,
                 1: 0.23999999999999999,
                 2: 0.059999999999999998,
                 3: 0.080000000000000002,
                 4: 0.02,
                 5: 0.0,
                 6: 0.02,
                 7: 0.0,
                 8: 0.02,
                 9: 0.01,
                 }
        response = result.to_dict().get('mc')
        self.assertEqual(expected, response)

    def test_report_datapulling(self):
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/datapulling349923.csv')
        obj = get_report_obj('datapulling', self.db)
        resp = obj.get_report(
                path=csv_path,
                limit=10,
                )
        expected = {0: 16932271, 1: 16932278, 2: 16932286, 3: 16932542, 4: 16932636, 5: 16932670, 6: 16932542, 7: 16932636, 8: 16932670, 9: 16932298}
        response = resp.to_dict().get('creative_id')
        self.assertEqual(expected, response)

    #TODO fix this report
    def test_write_mysql_insert_query(self):
        csv_path = os.path.realpath(__file__ + '../../test_csv_files/test2.csv')
        df = pd.read_csv(csv_path, index_col=True)
        cur = self.db.cursor()
        _cur = _sql._write_mysql(df, 'v4_reporting', df.columns.tolist(), cur)
        res = vars(_cur)
        expected_exe = "INSERT INTO v4_reporting (`date`,`line_item_id`,`campaign_id`,`creative_id`,`imps`,`clicks`,`media_cost`,`adx_spend`) VALUES ('2014-07-09 00:00:00',1037447,3657781,14654391,200,0,0.330013,0.13152) ON DUPLICATE KEY UPDATE v4_reporting.`date` = VALUES(v4_reporting.`date`),v4_reporting.`line_item_id` = VALUES(v4_reporting.`line_item_id`),v4_reporting.`campaign_id` = VALUES(v4_reporting.`campaign_id`),v4_reporting.`creative_id` = VALUES(v4_reporting.`creative_id`),v4_reporting.`imps` = VALUES(v4_reporting.`imps`),v4_reporting.`clicks` = VALUES(v4_reporting.`clicks`),v4_reporting.`media_cost` = VALUES(v4_reporting.`media_cost`),v4_reporting.`adx_spend` = VALUES(v4_reporting.`adx_spend`)"
        resp_exe = res.get('_last_executed').replace("\n","")
        self.assertEqual(expected_exe, resp_exe)
