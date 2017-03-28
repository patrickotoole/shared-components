import unittest
import pandas
from link import lnk 
import logging
from handlers import domains
from lib.appnexus_reporting import load
import pandas as pd
import mock


SETUP_FIXTURE = [
    {'external_advertiser_id': 430556 , "mediaplan": "mediaplan", "num_domains":5, "line_item_name":"Yoshi Testing", "endpoint": "/test" }
]


CREATE_DOMAIN_QUEUE_TABLE = '''
CREATE TABLE `yoshi_domain_log` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `domain` varchar(400) NOT NULL,
  `line_item_name` varchar(400) NOT NULL DEFAULT '',
  `external_advertiser_id` int(10) NOT NULL,
  `num_sublinks` int(10) NOT NULL,
  `num_tags` int(10) NOT NULL,
  `last_ran` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  `mediaplan` varchar(400) NOT NULL,
  PRIMARY KEY (`id`)
)
'''

DOMAIN_QUEUE_FIXTURE = [
    {"domain": "forbes.com", "line_item_name": "Yoshi Testing", "external_advertiser_id": 430556, "num_sublinks": 5, "num_tags":5, "created_at": "2017-03-03", "last_ran": "2017-03-03", "mediaplan":"test"}
]

MEDIA_PLAN_FIXTURE = [
{u'count': 1,
  u'domain': u'dailymail.co.uk',
  u'hour': u'00',
  u'idf': 3.6000497347,
  u'parent_category_name': u'Arts & Entertainment',
  u'tfidf': 3.6000497347,
  u'uniques': 1},
 {u'count': 3,
  u'domain': u'dailymotion.com',
  u'hour': u'00',
  u'idf': 139.6495176849,
  u'parent_category_name': u'Arts & Entertainment',
  u'tfidf': 139.6495176849,
  u'uniques': 1}
]

CREATE_ADVERTISER = '''
CREATE TABLE `advertiser` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) unsigned DEFAULT NULL,
  `pixel_source_name` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_advertiser` (`external_advertiser_id`)
)
'''

ADVERTISER_FIXTURE = [
  {'external_advertiser_id':430556,'pixel_source_name':'citi'}
]


class DataBaseTest(unittest.TestCase):

    def setUp(self):        
        self.db = lnk.dbs.test
        dl = load.DataLoader(self.db)
        
        len_check = self.db.execute("show tables like 'yoshi_domain_log'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE yoshi_domain_log")
        self.db.execute(CREATE_DOMAIN_QUEUE_TABLE)
        data = pd.DataFrame(DOMAIN_QUEUE_FIXTURE)
        dl.insert_df(data, "yoshi_domain_log",[], DOMAIN_QUEUE_FIXTURE[0].keys())


        len_check = self.db.execute("show tables like 'advertiser'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE advertiser")
        self.db.execute(CREATE_ADVERTISER)
        data = pd.DataFrame(ADVERTISER_FIXTURE)
        dl.insert_df(data, "advertiser",[], ADVERTISER_FIXTURE[0].keys())


        self.Database = domains.DomainsDatabase()
        self.Database.db = self.db

        self.Database.hindsight_authenticate = mock.Mock()
        self.Database.get_media_plan_data = mock.Mock(return_value = MEDIA_PLAN_FIXTURE)
        self.Database.get_setup = mock.Mock(return_value = pd.DataFrame(SETUP_FIXTURE))


    def teardown(self):
        self.db.execute("DROP TABLE yoshi_domain_log")
        self.db.execute("DROP TABLE advertiser")


    def test_get_domain_queue(self):

        cols = ['domain','line_item_name','mediaplan']

        true = pd.DataFrame(MEDIA_PLAN_FIXTURE)
        true['line_item_name'] = "Yoshi Testing"
        true['mediaplan'] = "mediaplan"
        true = true.sort(['mediaplan','line_item_name']).reset_index(drop = True)[cols]

        actual = self.Database.get_domains_queue(430556).sort(['mediaplan','line_item_name']).reset_index(drop = True)[cols]
        assert true.equals(actual)

    def test_write_queue_correct(self):

        to_write = pd.DataFrame([
            {"domain": "wsj.com", "line_item_name": "Yoshi Testing", "external_advertiser_id": 430556, "num_sublinks": 5, "num_tags":5, "created_at": "2017-03-03", "last_ran":"2017-03-03", "mediaplan":"test"}
        ])

        self.Database.write_queue(to_write)

        query = '''
        SELECT * 
        FROM yoshi_domain_log
        WHERE domain = "wsj.com" AND line_item_name = "Yoshi Testing" AND external_advertiser_id = 430556 
        AND num_sublinks = 5 AND num_tags = 5 AND date(created_at) = "2017-03-03" AND date(last_ran) = "2017-03-03"
        AND mediaplan = "test"
        '''

        df = self.Database.db.select_dataframe(query)
        assert len(df) > 0

    def test_write_queue_failure(self):
        to_write = pd.DataFrame([
            {"domain": "wsj.com", "external_advertiser_id": 430556, "num_sublinks": 5, "num_tags":5, "created_at": "2017-03-03", "last_ran":"2017-03-03", "mediaplan":"test"}
        ])
        self.assertRaises(AssertionError, self.Database.write_queue, to_write)


    def test_get_pixel_source_name(self):

        test = self.Database.get_pixel_source_name(430556)
        assert test == "citi"

        test = self.Database.get_pixel_source_name(1111)
        assert test == ""



