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

        self.Database = yoshi_setup.SetupDatabase()
        self.Database.db = self.db

    def teardown(self):
        self.db.execute("DROP TABLE yoshi_setup") 


    def test_get_setup(self):
        cols = SETUP_VALUES[0].keys()
        true = pd.DataFrame(SETUP_VALUES).sort(['external_advertiser_id','source','subsource']).reset_index(drop = True)
        actual = self.Database.get_setup(430556).sort(['external_advertiser_id','source','subsource']).reset_index(drop = True)  
        assert true[cols].equals(actual[cols])

    def test_insert(self):

        to_write = pd.DataFrame([
            {'external_advertiser_id': 430556 , "source": "source2", "subsource":"source2a", "num_domains":5, "line_item_name":"Yoshi Testing" }
        ])
        self.Database.insert(to_write)

        query = '''
        SELECT * FROM yoshi_setup WHERE external_advertiser_id = 430556 AND source = "source2" AND subsource = "source2a" AND num_domains = 5
        AND line_item_name = "Yoshi Testing" AND active = 1
        '''

        df = self.Database.db.select_dataframe(query)
        assert len(df) > 0

