import mock, pandas, json
import unittest
from mock import patch
import requests
import lib.caching.vendor_patterns as vps
import lib.caching.vendor_dashboard as vdb
import lib.caching.action_dashboard_cache as adc

URL_1 = "randomsite/refer=kfkf&source=nothing&utm_source=MySource&somethingelse"
JSON_FIXTURE_1 = {}
DA = {"url_patterns":"arandompatternorstring","vendor":["vendor"]}
RESPONSE_1 = dict({'response':[{'url_pattern':['url']}]})

mock_response = mock.MagicMock()
mock_response2 = mock.MagicMock()
mock_response2.__iter__ = mock.Mock(return_value = "url")
mock_response.json.side_effect = mock_response2

class VendorTests(unittest.TestCase):

    def setUp(self):
        self.instance = vps.VendorPattern({}, "test")
    
    def test_parse(self):
        utm_source = self.instance.parseRefer(URL_1)
        self.assertEquals(utm_source, "MySource")

    def test_parse_loop(self):
        df = pandas.DataFrame({"url":[URL_1]})
        df.T.apply(self.instance.applyRefer)
        self.assertEquals(self.instance.data['test'][0], "MySource")

    @mock.patch('requests.get', mock.MagicMock(side_effect = lambda x,cookies: mock_response))
    def test_iter_vendors(self):
        AC = adc.ActionCache("username", "password", mock.MagicMock())
        AC.cookie = {}
        df2 = pandas.DataFrame(DA)
        df2.T.apply(vdb.buildIter(AC,"test"))
        self.assertEquals(len(df2),1)
