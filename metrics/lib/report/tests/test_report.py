import os

import mock
from mock import patch
from mock import Mock
import pandas as pd
from link import lnk
from twisted.trial import unittest

from lib.pandas_sql import s as _sql
from lib.report.common import get_report_obj
from lib.report.utils.reportutils import get_path
from lib.report.reports.base import ReportBase
from lib.report.utils.reportutils import get_db
from lib.report.utils.reportutils import empty_frame

CUR_DIR = os.path.realpath(__file__)
TEST_FILES = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_files/'))
DOMAIN = 'domain'

DROP = "drop table {database}.v4_reporting_test_blah;"
CREATE = """
    CREATE TABLE `v4_reporting_test_blah` (
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

def _testfile_path(name):
    return os.path.join(TEST_FILES, name)

class ReportTestCase(unittest.TestCase):

    def setUp(self):
        self.db = lnk.dbs.test
        drop = DROP.format(database=self.db.database)
        try:
            self.db.execute(drop)
        except:
            pass
        self.db.execute(CREATE)
        self.db.commit()

    def tearDown(self):
        drop = DROP.format(database=self.db.database)
        self.db.execute(drop)
        self.db.commit()

    def test_report_domain(self):
        obj = get_report_obj('domain', self.db)
        csv_path = _testfile_path('advertiser,site_domain.csv')
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
        csv_path = _testfile_path('datapulling349923.csv')
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
        csv_path = _testfile_path('test2.csv')
        df = pd.read_csv(csv_path, index_col=True)
        cur = self.db.cursor()
        _cur = _sql._write_mysql(df, 'v4_reporting_test_blah', df.columns.tolist(), cur)
        res = vars(_cur)
        expected_exe = "INSERT INTO v4_reporting_test_blah (`date`,`line_item_id`,`campaign_id`,`creative_id`,`imps`,`clicks`,`media_cost`,`adx_spend`) VALUES ('2014-07-09 00:00:00',1037447,3657781,14654391,200,0,0.330013,0.13152) ON DUPLICATE KEY UPDATE v4_reporting_test_blah.`date` = VALUES(v4_reporting_test_blah.`date`),v4_reporting_test_blah.`line_item_id` = VALUES(v4_reporting_test_blah.`line_item_id`),v4_reporting_test_blah.`campaign_id` = VALUES(v4_reporting_test_blah.`campaign_id`),v4_reporting_test_blah.`creative_id` = VALUES(v4_reporting_test_blah.`creative_id`),v4_reporting_test_blah.`imps` = VALUES(v4_reporting_test_blah.`imps`),v4_reporting_test_blah.`clicks` = VALUES(v4_reporting_test_blah.`clicks`),v4_reporting_test_blah.`media_cost` = VALUES(v4_reporting_test_blah.`media_cost`),v4_reporting_test_blah.`adx_spend` = VALUES(v4_reporting_test_blah.`adx_spend`)"
        resp_exe = res.get('_last_executed').replace("\n","")
        self.assertEqual(expected_exe, resp_exe)

    def test_get_path(self):
        d = dict(name='domain', group='advertiser,domain,line_item',
                 start_date='2014-08-13 10:00:00', end_date='2014-08-13 11:00:00')
        resp = get_path(**d)
        expec = '/tmp/domain_advertiser,domain,line_item2014-08-13-10_2014-08-13-11.csv'
        self.assertEqual(expec, resp)

    def test_get_dataframes_success(self):
        path = _testfile_path('mocked_response.txt')
        mocked_resp = open(path, 'r').read()
        expected = pd.read_csv(path)
        with mock.patch.object(ReportBase, "_get_resp_helper") as m:
            with mock.patch.object(ReportBase, "_get_form_helper") as h:
                h.return_value = ''
                m.return_value = mocked_resp
                resp = ReportBase(self.db)._get_dataframe()
                self.assertTrue(expected.equals(resp))

    def test_get_dataframes_failure(self):
        with mock.patch.object(ReportBase, "_get_resp_helper") as m:
            with mock.patch.object(ReportBase, "_get_form_helper") as h:
                h.return_value = ''
                m.side_effect = ValueError('blow')
                resp = ReportBase(self.db)._get_dataframe()
                expected = empty_frame()
                self.assertTrue(expected.equals(resp))

    def test_get_report_obj(self):
        obj = get_report_obj('domain', self.db)
        expected = obj._name
        self.assertEqual(expected, 'domain')

    def test_get_db(self):
        assert get_db('test').database == self.db.database
        random = 'random'
        try:
            get_db(random)
        except Exception as e:
            assert isinstance(e, KeyError)
            assert e.message == 'No such configured object dbs.%s' % random

    def test_accounting(self):
        """
        make sure the stats is 0 when work fails:
         - wrong insert
         - not able to get response, exceptions
        """
        pass

    def test_report_inserts(self):
        """
        potentially use this:
        lib.report.utils.reportutils import correct_insert
        """
        pass
