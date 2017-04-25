import mock, pandas, json
import unittest
import datetime

import scripts.check_segment_data as csd
from link import lnk

RESP_FIXTURE= {"search":[["\/"]],"summary":{"users":698440,"visits":3809680,"views":8723740},"results":[{"date":"2017-04-05 00:00:00","uniques":45500,"visits":250900,"views":578380},{"date":"2017-04-06 00:00:00","uniques":41900,"visits":221760,"views":505220},{"date":"2017-04-07 00:00:00","uniques":38600,"visits":216620,"views":488020},{"date":"2017-04-08 00:00:00","uniques":23080,"visits":131920,"views":300900},{"date":"2017-04-09 00:00:00","uniques":23680,"visits":118500,"views":269680},{"date":"2017-04-10 00:00:00","uniques":46500,"visits":253520,"views":573560},{"date":"2017-04-11 00:00:00","uniques":39880,"visits":209580,"views":478860},{"date":"2017-04-12 00:00:00","uniques":37440,"visits":203120,"views":471500},{"date":"2017-04-13 00:00:00","uniques":40900,"visits":210580,"views":481620},{"date":"2017-04-14 00:00:00","uniques":45600,"visits":226000,"views":524060},{"date":"2017-04-15 00:00:00","uniques":22140,"visits":115380,"views":267820},{"date":"2017-04-16 00:00:00","uniques":20240,"visits":110020,"views":249820},{"date":"2017-04-17 00:00:00","uniques":43100,"visits":232900,"views":534980},{"date":"2017-04-18 00:00:00","uniques":43020,"visits":227200,"views":518000},{"date":"2017-04-19 00:00:00","uniques":41060,"visits":238460,"views":554560},{"date":"2017-04-20 00:00:00","uniques":38640,"visits":234460,"views":537780},{"date":"2017-04-21 00:00:00","uniques":39440,"visits":219540,"views":498540},{"date":"2017-04-22 00:00:00","uniques":20460,"visits":124400,"views":287360},{"date":"2017-04-23 00:00:00","uniques":20120,"visits":125160,"views":285720},{"date":"2017-04-24 00:00:00","uniques":27140,"visits":139660,"views":317360}],"logic":"filtered"}

CREATE_LOG = """
CREATE TABLE `advertiser_segment_check` (
  `pixel_source_name` varchar(250) DEFAULT NULL,
  `url_pattern` varchar(250) DEFAULT NULL,
  `filter_id` int(12) DEFAULT NULL,
  `pixel_fires` tinyint(1) DEFAULT '0',
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date` date DEFAULT NULL,
  `skip_at_log` tinyint(1) DEFAULT '0',
  `job_id` varchar(250) DEFAULT NULL
)
"""

DELETE_LOG = "drop table advertiser_segment_check"

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
    if "select a.action_id" in QUERY:
        return pandas.DataFrame({"pixel_source_name":["fsastore"], "action_id":[1336], "url_pattern":["/"], "action_name":["All Pages"]})
    if "select skip" in QUERY:
        return pandas.DataFrame({"skip":[0]})
    if "select pixel_fires" in QUERY:
        return pandas.DataFrame({})
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
        self.csd_instance = csd.CheckSegmentData(connectors_mock["db"],connectors_mock["api"], connectors_mock["crushercache"])
        self.csd_instance.segment_dict = {'fsastore':pandas.DataFrame([{"action_id":1336,"url_pattern":"/"}])}
        self.csd_instance.advertisers = ['fsastore']
        self.logging_called = 0 

    def tearDown(self):
        self.test_db.execute(DELETE_LOG)
        
    def test_run(self):
        self.csd_instance.iter_segments("test012345")
        data = self.test_db.select_dataframe("select * from advertiser_segment_check")
        self.assertTrue(len(data) >0 )

    def test_check_yesterday(self):
        def logmock(x):
            assert "changed expectation" in x
            self.logging_called = 1
        with mock.patch('logging.info', logmock):
            self.csd_instance.check_yesterday(1336, 1)
        self.assertEqual(self.logging_called, 1)
