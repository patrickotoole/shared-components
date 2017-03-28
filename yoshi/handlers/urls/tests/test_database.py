import unittest
import pandas
from link import lnk 
import logging
from lib.appnexus_reporting import load
import pandas as pd
from handlers import urls

CREATE_DOMAIN_LINKS = '''
CREATE TABLE `yoshi_domain_links` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `domain` varchar(400) NOT NULL,
  `url` varchar(400) NOT NULL,
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain` (`domain`,`url`)
)
'''

DOMAIN_LINKS_FIXTURE = [{"domain":"domain.com", "url":"test.com", "domain":"domain.com","url":"test/\/\2.com"}]


class DataBaseTest(unittest.TestCase):

    def setUp(self):        
        self.db = lnk.dbs.test
        dl = load.DataLoader(self.db)

        len_check = self.db.execute("show tables like 'yoshi_domain_links'")
        if len(len_check.as_dataframe())>0:
            self.db.execute("DROP TABLE yoshi_domain_links") 
        self.db.execute(CREATE_DOMAIN_LINKS)
        data = pd.DataFrame(DOMAIN_LINKS_FIXTURE)
        dl.insert_df(data, "yoshi_domain_links",[], DOMAIN_LINKS_FIXTURE[0].keys())

        self.Database = urls.UrlDatabase()
        self.Database.db = self.db

    def teardown(self):
        self.db.execute("DROP TABLE yoshi_domain_links")

    def test_process_domain_string(self):

        test = urls.process_domain_string("test1.com,test2.com")
        assert test == "('test1.com', 'test2.com')"

    def test_get_domain_links(self):

        cols = ['domain','url']
        true = pd.DataFrame(DOMAIN_LINKS_FIXTURE).sort(cols).reset_index(drop = True)
        actual = self.Database.get_domain_links("domain.com").sort(cols).reset_index(drop = True)
        assert true.equals(actual)


    def test_insert_domain_links(self):

        data = [{'domain':'domain2.com', 'url':'test2.com'}]
        self.Database.insert_domain_links(data)

        actual = self.Database.get_domain_links("domain2.com")
        true = pd.DataFrame(data)
        assert true.equals(actual)



