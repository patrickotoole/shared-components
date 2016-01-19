import mock, pandas, json
import unittest
import requests
request = mock.MagicMock()
requests.get.side_effect = lambda x : {}
requests.post.side_effect = lambda x : {}
import lib.caching.vendor_patterns as vps
import lib.caching.vendor_dashboard as vdb
import lib.caching.action_dashboard_cache as adc

URL_1 = "http://randomsite.com/refer=kfkf&source=nothing&utm_source=MySource&somethingelse"
JSON_FIXTURE_1 = {}
DA = {"url_patterns":["test"],"vendor":["vendor"]}

class VendorTests(unittest.TestCase):

    def setUp(self):
        self.instance = vps.VendorPattern({}, "test")
        requests = mock.MagicMock()
    
    def test_parse(self):
        utm_source = self.instance.parseRefer(URL_1)
        self.assertEquals(utm_source, "MySource")

    def test_parse_loop(self):
        df = pandas.DataFrame({"url":[URL_1]})
        df.T.apply(self.instance.applyRefer)
        self.assertEquals(self.instance.data['test'][0], "MySource")
    
    def test_iter_vendors(self):
        AC = adc.ActionCache("username", "password", mock.MagicMock())
        AC.cookie = {}
        df2 = pandas.DataFrame(DA)
        df2.T.apply(vdb.buildIter(AC,"test"))
        self.assertEquals(len(df2),1)
