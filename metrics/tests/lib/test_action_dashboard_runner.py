import mock, pandas, json
import unittest

import lib.caching.action_dashboard_runner as adr

JSON_FIXTURE_1 = {'domains':[{"domain":"test","count":0}]}
JSON_FIXTURE_2 = {'domains':[{"domain":"blank", "count":"1"}, {"domain":"blank","count":"1"},{"domain":"blank","count":"1"}]}
JSON_FIXTURE_3 = {'domains':[""]}
JSON_FIXTURE_4 = {}


def buildSQLQuery(arr):
    def innerFn(dataFrame,name,columns,conn,keys):
        arr.append(dataFrame)
        return arr
    return innerFn

class ActionCacheTestCase(unittest.TestCase):
    
    def setUp(self):
        mock_zk = mock.MagicMock()
        mock_zk.start.side_effect = lambda : ""
        mock_db = mock.MagicMock()
        connectors_mock = {'db': mock_db, "zk":mock_zk}
        self.instance = adr.AdvertiserActionRunner(connectors_mock)
        self.instance.crusher = mock.MagicMock()
        self.instance.action_id = 0
        self.instance.url_pattern = "/"
        self.futureFrames = []
        self.instance.sql_query = mock.MagicMock(side_effect=buildSQLQuery(self.futureFrames))

    def test_insert_success_one_record(self):
        df = pandas.DataFrame(JSON_FIXTURE_1['domains'])
        i = self.instance.insert(df, "table_name", mock.MagicMock(), df.columns)
        self.assertEquals(len(df), len(pandas.concat(self.futureFrames)))

    def test_insert_success_multiple_records(self):
        df = pandas.DataFrame(JSON_FIXTURE_2['domains'])
        i = self.instance.insert(df, "table_name", "con", df.columns)
        self.assertEquals(len(df), len(pandas.concat(self.futureFrames)))

    def test_insert_failuree_no_data(self):
        df = pandas.DataFrame(JSON_FIXTURE_3)
        i = self.instance.insert(df, "table_name", "con", df.columns)
        self.assertEquals(len(self.futureFrames),0)

    def test_insert_failure_empty_set_response(self):
        df = pandas.DataFrame(JSON_FIXTURE_4)
        i = self.instance.insert(df, "table_name", "con", df.columns)
        self.assertEquals(len(self.futureFrames),0)

