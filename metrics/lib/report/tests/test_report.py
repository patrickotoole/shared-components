import os
from datetime import timedelta

import mock
from mock import patch
from mock import Mock
import pandas as pd
from pandas.util.testing import assert_frame_equal
from link import lnk
from twisted.trial import unittest

from lib.pandas_sql import s as _sql
from lib.report.utils.reportutils import get_report_obj
from lib.report.utils.reportutils import get_path
from lib.report.reports.base import ReportBase
from lib.report.analyze import report as analyze_report
from lib.report.analyze.report import AnalyzeConversions
from lib.report.utils.reportutils import get_db
from lib.report.utils.reportutils import get_unique_keys
from lib.report.utils.reportutils import write_mysql
from lib.report.utils.utils import parse
from lib.report.utils.utils import local_now
from lib.report.utils.utils import align

CUR_DIR = os.path.realpath(__file__)
TEST_FILES = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_files/'))
DOMAIN = 'domain'

DROP = """
drop table {database}.v4_reporting_test_blah;
drop table {database}.v2_conversion_reporting_test_blah;
drop table {database}.nouniq;
drop table {database}.uniq;
"""

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
  `cpm_multiplier` decimal(20,10) DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `notes` varchar(400) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique` (`date`,`external_advertiser_id`,`campaign_id`,`creative_id`,`line_item_id`),
  UNIQUE KEY `uniquer` (`date`,`external_advertiser_id`,`campaign_id`,`creative_id`)
)
"""

CREATE_V2_CON = """
CREATE TABLE `v2_conversion_reporting_test_blah` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) DEFAULT NULL,
  `pixel_id` int(10) NOT NULL,
  `pixel_name` varchar(250) DEFAULT NULL,
  `line_item_id` int(10) NOT NULL,
  `line_item_name` varchar(250) DEFAULT NULL,
  `campaign_id` int(10) DEFAULT NULL,
  `campaign_name` varchar(500) DEFAULT NULL,
  `creative_id` int(10) DEFAULT NULL,
  `creative_name` varchar(250) DEFAULT NULL,
  `pc` tinyint(1) DEFAULT NULL,
  `order_id` varchar(100) DEFAULT NULL,
  `user_id` varchar(40) DEFAULT NULL,
  `auction_id` varchar(40) DEFAULT NULL,
  `imp_time` datetime DEFAULT NULL,
  `conversion_time` datetime DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  `active` tinyint(4) DEFAULT '1',
  `new_user` tinyint(1) DEFAULT '1',
  `is_valid` tinyint(1) DEFAULT '1',
  `notes` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique` (`pixel_id`,`line_item_id`,`campaign_id`,`creative_id`,`order_id`,`user_id`,`auction_id`,`conversion_time`)
)
"""

CREATE_NOUNIQ = """
CREATE TABLE `nouniq` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL,
  `email` varchar(40) NOT NULL,
  `address` varchar(40) NOT NULL,
  PRIMARY KEY (`id`)
)
"""

CREATE_UNIQ = """
CREATE TABLE `uniq` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL,
  `email` varchar(40) NOT NULL,
  `address` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique` (`name`, `email`)
)
"""

"""
want to make sure the status is 0 when job failed,
and sure what's inserted is the exact csv report we got from appnexus.
"""

def _sorted(df):
    df.sort(axis=1, inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df

class ReportTestCase(unittest.TestCase):
    def setUp(self):
        self.db = lnk.dbs.test
        drop = DROP.format(database=self.db.database)

        try:
            self.db.execute(drop)
        except:
            pass

        self.db.execute(CREATE)
        self.db.execute(CREATE_V2_CON)
        self.db.execute(CREATE_NOUNIQ)
        self.db.execute(CREATE_UNIQ)
        self.db.commit()

    def tearDown(self):
        drop = DROP.format(database=self.db.database)
        self.db.execute(drop)
        self.db.commit()

    def test_get_unique_keys(self):
        k1 = get_unique_keys(self.db, 'v4_reporting_test_blah')
        k2 = get_unique_keys(self.db, 'v2_conversion_reporting_test_blah')
        k3 = get_unique_keys(self.db, 'nouniq')
        e1 = set(['campaign_id',
                  'creative_id',
                  'date',
                  'external_advertiser_id',
                  'line_item_id',
                  ])
        e2 = set(['pixel_id',
                  'line_item_id',
                  'campaign_id',
                  'creative_id',
                  'order_id',
                  'user_id',
                  'auction_id',
                  'conversion_time',
                  ])
        self.assertEqual(k1, e1)
        self.assertEqual(k2, e2)
        self.assertEqual(k3, set())

    def test_write_mysql_handle_duplicates(self):
        """
        1. correctlly handle duplicates

        2. blow up when it should.
        3. handle mysql connection, reconnect etc. mysql error
        4. get the unique key correctly.

        when iserting duplicate. if stuff is updated.
        """

        cols = ['name', 'email', 'address']
        df_insert = _sorted(pd.DataFrame([{'name': 'wei',
                                           'email': 'wei@1.com',
                                           'address': '123',
                                           }]))
        df_update = _sorted(pd.DataFrame([{'name': 'wei',
                                           'email': 'wei@1.com',
                                           'address': '12',
                                           }]))
        nouniq, uniq = 'nouniq', 'uniq'
        q1 = "select * from nouniq"
        q2 = "select * from uniq"

        write_mysql(df_insert, table=nouniq, con=self.db)
        write_mysql(df_insert, table=uniq, con=self.db)

        db_nouniq = _sorted(self.db.select_dataframe(q1)[cols])
        db_uniq = _sorted(self.db.select_dataframe(q2)[cols])

        assert_frame_equal(db_nouniq, df_insert)
        assert_frame_equal(db_uniq, db_nouniq)

        write_mysql(df_update, table=nouniq, con=self.db)
        write_mysql(df_update, table=uniq, con=self.db)

        db_nouniq = _sorted(self.db.select_dataframe(q1)[cols])
        db_uniq = _sorted(self.db.select_dataframe(q2)[cols])

        db_nouniq_exp = _sorted(pd.concat([df_insert, df_update]))
        assert_frame_equal(db_nouniq, db_nouniq_exp)
        assert_frame_equal(db_uniq, df_update)

    def test_write_mysql_handle_blowup(self):
        pass

    def test_is_valid(self):
        valid = 1
        df = pd.DataFrame([
            {'imp_time':        '2014-10-16 00:00:00',
             'conversion_time': '2014-10-16 01:00:00'
             },
            {'imp_time':        '2014-10-16 00:00:00',
             'conversion_time': '2014-10-16 01:01:00'
             },
        ])

        analyze_report._get_window_hours = mock.Mock(return_value=timedelta(hours=1))
        df = df.apply(analyze_report._is_valid, axis=1)
        expected = [
            valid,
            not valid,
        ]
        self.assertEqual(list(df['is_valid'].values), expected)

        analyze_report._get_window_hours = mock.Mock(return_value=timedelta(hours=0))
        df = df.apply(analyze_report._is_valid, axis=1)
        expected = [
            not valid,
            not valid,
        ]
        self.assertEqual(list(df['is_valid'].values), expected)

    def test_analyzers(self):
        """
        make sure functions in lib.report.analyze.report works properly
        """
        pass

    def test_integrity_check(self):
        pass

    def test_get_report(self):
        """
        test when appnexus blocked us.
        """
        pass

    def test_exit_with_errorcode(self):
        """
        report script should exit with 1 when anything failed, so
        chronos will pick up
        """
        pass
