import mock, pandas, json
import unittest
import datetime

import scripts.check_pixel_fires as cpf
from link import lnk

RESP_FIXTURE = [{"advertiser":"fsastore","uid":"0","segment_id":"123","timestamp":"2020-01-01 23:00:00","json_body":"{}","u2":"00","source":"fsastore","segment":"1234"},{"advertiser":"fsastore","uid":"0","segment_id":"123","timestamp":"2020-01-01 23:00:00","json_body":"{}","u2":"00","source":"fsastore","segment":"1234"},{"advertiser":"fsastore","uid":"0","segment_id":"123","timestamp":"2020-01-01 23:00:00","json_body":"{}","u2":"00","source":"fsastore","segment":"1234"}]

CREATE_LOG = """
CREATE TABLE `advertiser_pixel_fires` (
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `pixel_fires` tinyint(1) DEFAULT '0',
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date` date DEFAULT NULL,
  `skip_at_log` tinyint(1) DEFAULT '0',
  `job_id` varchar(250) DEFAULT NULL
)
"""

DELETE_LOG = "drop table advertiser_pixel_fires"

def buildSQLQuery(arr):
    def innerFn(dataFrame,name,columns,conn,keys):
        arr.append(dataFrame)
        return arr
    return innerFn

def advertiser_database_mock(QUERY):
    if "select a.pixel_source_name" in QUERY:
        return pandas.DataFrame({"pixel_source_name":[]})
    if "select pixel_source_name " in QUERY:
        return pandas.DataFrame({"pixel_source_name":["fsastore"]})
    if "select skip" in QUERY:
        return pandas.DataFrame({"skip":[0]})
    if "select external_segment_id" in QUERY:
        return pandas.DataFrame({"external_segment_id":[123]})
    return None
        

class CheckPixelTest(unittest.TestCase):
    
    def setUp(self):
        mock_db = mock.MagicMock()
        self.test_db  =  lnk.dbs.test
        mock_crushercache = self.test_db
        mock_api = mock.MagicMock()
        mock_api.side_effect = lambda x : RESP_FIXTURE 
        mock_db.side_effect = lambda x : advertiser_database_mock(x)
        yesterday_date = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        try:
            mock_crushercache.execute(CREATE_LOG)
        except:
            import logging
            logging.info("table already create")
        mock_data = {"date":yesterday_date, "advertiser": "fsastore", "pixel_fires":0}
        connectors_mock = {"db": mock_db, "crushercache": mock_crushercache, "api":mock_api}
        self.cpf_instance = cpf.SetCacheList(connectors_mock["db"],connectors_mock["api"], connectors_mock["crushercache"])
        self.cpf_instance.advertisers = ['fsastore']

    def tearDown(self):
        self.test_db.execute(DELETE_LOG)
        
    def test_run(self):
        self.cpf_instance.populate_advertiser_table("test012345")
        data = self.test_db.select_dataframe("select * from advertiser_pixel_fires")
        self.assertTrue(len(data) >0 )

