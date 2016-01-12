import mock, pandas, json
import unittest
import action_dashboard_cache as adc

JSON_FIXTURE_1 = {'domains':[{"domain":"", "count":""}]}
JSON_FIXTURE_2 = {'domains':[{"domain":"", "count":""}, {"domain":"","count":""},{"domain":"", "count":""}]}
JSON_FIXTURE_3 = {'domains':[""]}
JSON_FIXTURE_4 = {}

#FIXTURES = [{'domains':[{"domain":"", "count":""}]}, {'domains':[{"domain":"", "count":""}, {"domain":"","count":""},{"domain":"", "count":""}]}, {'domains':[""]}, {}]

def get_helper1(url, cookies=None):
	response = mock.MagicMock()
	if(url=="http://crusher.getrockerbox.com/crusher/funnel/action?format=json"):
		response.json.side_effect = lambda : {"response":[{"url_pattern":"", "action_name":"", "action_id":""}]}
		return response

def post_helper(url, data):
	response = mock.MagicMock()
	response.cookie.side_effect = lambda x:""
	return response

def buildSQLQuery(arr):
	
	def innerFn(dataFrame,name,columns,conn,keys):
		arr.append(dataFrame)
		return arr

	return innerFn

def buildHelper(fix):

	def get_helper2(url, cookies=None):
		response = mock.MagicMock()
        	response.json.side_effect = lambda : fix
                return response

	return get_helper2

class ActionCacheTestCase(unittest.TestCase):

	def setUp(self):
		self.instance = adc.ActionCache("username" ,"password", mock.MagicMock())
		self.instance.req = mock.MagicMock()
		self.instance.req.post.side_effect = post_helper
		self.instance.req.get.side_effect = get_helper1
		self.futureFrames = []
		self.instance.sql_query = mock.MagicMock(side_effect=buildSQLQuery(self.futureFrames))

	def test_auth(self):
		self.instance.auth()
		self.assertIsNotNone(self.instance.cookie)

	def test_segments_query(self):
		self.instance.auth()
		segments = self.instance.get_segments()
		self.assertIs(type(segments), list)
		self.assertTrue(len(segments)>=1)
		return segments

	def test_request_succes_one_record(self):
		self.instance.auth()
		self.instance.req.get.side_effect = mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE_1))
		r = self.instance.make_request("patern", "advertiser", "action", 01)
		self.assertEqual(type(r), type(pandas.DataFrame()))
		self.assertTrue(len(r)>=1)

        def test_request_succes_multiple_record(self):
                self.instance.auth()
		self.instance.req.get.side_effect = mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE_2))
                r = self.instance.make_request("patern", "advertiser", "action", 01)
                self.assertEqual(type(r), type(pandas.DataFrame()))
                self.assertTrue(len(r)>=1)

        def test_request_failure_no_data(self):
                self.instance.auth()
		self.instance.req.get.side_effect = mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE_3))
                r = self.instance.make_request("patern", "advertiser", "action", 01)
                self.assertEqual(type(r), type(pandas.DataFrame()))
                self.assertTrue(len(r)==0)

        def test_request_failure_empty_set_response(self):
                self.instance.auth()
		self.instance.req.get.side_effect = mock.MagicMock(side_effect=buildHelper(JSON_FIXTURE_4))
                r = self.instance.make_request("patern", "advertiser", "action", 01)
                self.assertEqual(type(r), type(pandas.DataFrame()))
                self.assertTrue(len(r)==0)

	def test_insert_success_one_record(self):
		df = pandas.DataFrame(JSON_FIXTURE_1)
		i = self.instance.insert(df, "table_name", df.columns, "con", df.columns)
		self.assertEquals(len(df), len(pandas.concat(self.futureFrames)))

	def test_insert_success_multiple_records(self):
		df = pandas.DataFrame(JSON_FIXTURE_2)
		i = self.instance.insert(df, "table_name", df.columns, "con", df.columns)
		self.assertEquals(len(df), len(pandas.concat(self.futureFrames)))

        def test_insert_failuree_no_data(self):
                df = pandas.DataFrame(JSON_FIXTURE_3)
                i = self.instance.insert(df, "table_name", df.columns, "con", df.columns)
                self.assertEquals(len(pandas.concat(self.futureFrames)),1)

        def test_insert_failure_empty_set_response(self):
                df = pandas.DataFrame(JSON_FIXTURE_4)
                i = self.instance.insert(df, "table_name", df.columns, "con", df.columns)
                self.assertEquals(len(self.futureFrames),0)
