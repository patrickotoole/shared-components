import unittest
import pandas
from link import lnk 
import logging
from handlers import domains
from lib.appnexus_reporting import load
import pandas as pd


CREATE_SETUP_TABLE = '''
CREATE TABLE `yoshi_setup` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) NOT NULL,
  `source` varchar(400) NOT NULL,
  `subsource` varchar(400) NOT NULL,
  `num_domains` int(10) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `last_modified` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  `line_item_name` varchar(400) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_advertiser_id` (`external_advertiser_id`,`source`,`subsource`,`line_item_name`)
)
'''
SETUP_VALUES = [
    {'external_advertiser_id': 430556 , "source": "source1", "subsource":"source1a", "num_domains":5, "line_item_name":"Yoshi Testing" }
]


CREATE_DOMAIN_SOURCE_TABLE = '''
CREATE TABLE IF NOT EXISTS dora_domains_source
(
    id int(10) NOT NULL AUTO_INCREMENT,
    external_advertiser_id int(10) NOT NULL,
    domain varchar(400) NOT NULL,
    source varchar(400) NOT NULL,
    subsource varchar(400) NOT NULL,
    weight decimal(20,10) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE (external_advertiser_id, domain, source, subsource)
)
'''

DOMAIN_SOURCE_VALUES = [
    {"external_advertiser_id": 430556, "domain":"forbes.com", "source":"source1", "subsource": "source1a",  "weight": 90.},
    {"external_advertiser_id": 430556, "domain":"nytimes.com", "source":"source1", "subsource": "source1a", "weight":85.},
    {"external_advertiser_id": 430556, "domain":"cnn.com", "source":"source1", "subsource": "source1a", "weight": 83.},
    {"external_advertiser_id": 430556, "domain":"apple.com", "source":"source1", "subsource": "source1a", "weight": 91.},
]


CREATE_DOMAIN_QUEUE_TABLE = '''
CREATE TABLE `yoshi_domain_queue` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `domain` varchar(400) NOT NULL,
  `line_item_name` varchar(400) NOT NULL DEFAULT '',
  `external_advertiser_id` int(10) NOT NULL,
  `num_sublinks` int(10) NOT NULL,
  `num_tags` int(10) NOT NULL,
  `last_ran` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`)
)
'''

DOMAIN_QUEUE_VALUES = [
    {"domain": "forbes.com", "line_item_name": "Yoshi Testing", "external_advertiser_id": 430556, "num_sublinks": 5, "num_tags":5, "created_at": "2017-03-03"}
]

DOMAIN_QUEUE_COLS = ['domain','line_item_name','external_advertiser_id','num_sublinks','num_tags','created_at']


class DataBaseTest(unittest.TestCase):


    def setUp(self):        
        self.db = lnk.dbs.test
        dl = load.DataLoader(self.db)

        len_check = self.db.execute("show tables like 'yoshi_setup'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE yoshi_setup") 
        self.db.execute(CREATE_SETUP_TABLE)
        data = pd.DataFrame(SETUP_VALUES)
        dl.insert_df(data, "yoshi_setup",[], SETUP_VALUES[0].keys() )
        
        len_check = self.db.execute("show tables like 'dora_domains_source'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE dora_domains_source")
        self.db.execute(CREATE_DOMAIN_SOURCE_TABLE)
        data = pd.DataFrame(DOMAIN_SOURCE_VALUES)
        dl.insert_df(data, "dora_domains_source",[], DOMAIN_SOURCE_VALUES[0].keys())
        
        len_check = self.db.execute("show tables like 'yoshi_domain_queue'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE yoshi_domain_queue")
        self.db.execute(CREATE_DOMAIN_QUEUE_TABLE)
        data = pd.DataFrame(DOMAIN_QUEUE_VALUES)
        dl.insert_df(data, "yoshi_domain_queue",[], DOMAIN_QUEUE_VALUES[0].keys())

        self.Database = domains.DomainsDatabase()
        self.Database.db = self.db

    def teardown(self):
        self.db.execute("DROP TABLE yoshi_domain_queue")
        self.db.execute("DROP TABLE yoshi_setup") 
        self.db.execute("DROP TABLE dora_domains_source")


    def test_get_setup(self):
        cols = SETUP_VALUES[0].keys()
        true = pd.DataFrame(SETUP_VALUES).sort(['external_advertiser_id','source','subsource']).reset_index(drop = True)
        actual = self.Database.get_setup(430556).sort(['external_advertiser_id','source','subsource']).reset_index(drop = True)  
        assert true[cols].equals(actual[cols])

    def test_get_domain_queue(self):
        cols = DOMAIN_SOURCE_VALUES[0].keys() + ['line_item_name']
        true = pd.DataFrame([x for x in DOMAIN_SOURCE_VALUES if x['domain']!= "forbes.com"]).sort('domain').reset_index(drop=True)
        true['line_item_name'] = "Yoshi Testing"
        actual = self.Database.get_domains_queue(430556).sort('domain').reset_index(drop=True)
        assert true[cols].equals(actual[cols])


    def test_write_queue(self):

        to_write = pd.DataFrame([
            {"domain": "wsj.com", "line_item_name": "Yoshi Testing", "external_advertiser_id": 430556, "num_sublinks": 5, "num_tags":5, "created_at": "2017-03-03", "last_ran":"2017-03-03"}
        ])

        self.Database.write_queue(to_write)

        query = '''
        SELECT * 
        FROM yoshi_domain_queue
        WHERE domain = "wsj.com" AND line_item_name = "Yoshi Testing" AND external_advertiser_id = 430556 
        AND num_sublinks = 5 AND num_tags = 5 AND date(created_at) = "2017-03-03" AND date(last_ran) = "2017-03-03"
        '''

        df = self.Database.db.select_dataframe(query)
        assert len(df) > 0



