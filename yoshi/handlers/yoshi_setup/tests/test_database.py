import unittest
import pandas
from link import lnk 
import logging
from handlers import yoshi_setup
from lib.appnexus_reporting import load
import pandas as pd


CREATE_SETUP_TABLE = '''
CREATE TABLE `yoshi_setup` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) NOT NULL,
  `mediaplan` varchar(400) NOT NULL DEFAULT '',
  `num_domains` int(10) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `last_modified` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  `line_item_name` varchar(400) DEFAULT 'Yoshi Testing',
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_advertiser_id` (`external_advertiser_id`,`mediaplan`,`line_item_name`)
)
'''


SETUP_VALUES = [
    {'external_advertiser_id': 430556 , "mediaplan": "mediaplan", "num_domains":5, "line_item_name":"Yoshi Testing" }
]

CREATE_ADWORD_ENDPOINTS = '''
CREATE TABLE `adwords_campaign_endpoint` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `advertiser_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `deleted` tinyint(4) DEFAULT '0',
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `endpoint` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`)
)
'''

ADWORDS_VALUES = [
    {'advertiser_id':430556, 'name': "mediaplan", "endpoint": "\/test"}
]


class DataBaseTest(unittest.TestCase):

    def setUp(self):        
        self.db = lnk.dbs.test
        dl = load.DataLoader(self.db)

        len_check = self.db.execute("show tables like 'yoshi_setup'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE yoshi_setup") 
        self.db.execute(CREATE_SETUP_TABLE)
        data = pd.DataFrame(SETUP_VALUES)
        dl.insert_df(data, "yoshi_setup",[], SETUP_VALUES[0].keys())

        len_check = self.db.execute("show tables like 'adwords_campaign_endpoint'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE adwords_campaign_endpoint")
        self.db.execute(CREATE_ADWORD_ENDPOINTS)
        data = pd.DataFrame(ADWORDS_VALUES)
        dl.insert_df(data, "adwords_campaign_endpoint",[], ADWORDS_VALUES[0].keys())

        self.Database = yoshi_setup.SetupDatabase()
        self.Database.db = self.db
        self.Database.crushercache = self.db

    def teardown(self):
        self.db.execute("DROP TABLE yoshi_setup") 
        self.db.execute("DROP TABLE adwords_campaign_endpoint")

    def test_get_yoshi_setup(self):
        cols = ["mediaplan", "num_domains", "line_item_name"]
        true = pd.DataFrame(SETUP_VALUES).sort(['mediaplan']).reset_index(drop = True)[cols]
        actual = self.Database.get_yoshi_setup(430556).sort(['mediaplan']).reset_index(drop = True)[cols]
        assert true.equals(actual)

    def test_get_media_plans(self):

        cols = ['name','endpoint']
        true = pd.DataFrame(ADWORDS_VALUES).sort('name').reset_index(drop = True)[cols]
        actual = self.Database.get_media_plans(430556).sort(['name']).reset_index(drop = True)[cols]
        assert true.equals(actual)

    def test_insert(self):

        to_write = pd.DataFrame([
            {'external_advertiser_id': 430556 , "mediaplan": "source2", "num_domains":5, "line_item_name":"Yoshi Testing" }
        ])
        self.Database.insert(to_write)

        query = '''
        SELECT * FROM yoshi_setup WHERE external_advertiser_id = 430556 AND mediaplan = "source2" AND num_domains = 5
        AND line_item_name = "Yoshi Testing" AND active = 1
        '''

        df = self.Database.db.select_dataframe(query)
        assert len(df) > 0

