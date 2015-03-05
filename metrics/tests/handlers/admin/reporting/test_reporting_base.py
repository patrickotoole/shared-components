import sys
import mock
import os
sys.path.append("../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode 

import unittest
import metrics.handlers.admin.reporting.base as base
import datetime

def side_effect(return_value=False):
    return lambda self, x: return_value if return_value else x

class AdminReportingBaseTestCase(unittest.TestCase):

    def setUp(self):
        self.a = base.AdminReportingBase()

    def tearDown(self):
        pass

    def test_get_group(self):
        expected = "blah"
        result = self.a.get_group("blah")
        self.assertEqual(expected,result)

    def test_get_field(self):
        expected = "field_name as field_name"
        result = self.a.get_field("field_name")
        self.assertEqual(expected,result)

        self.a.FIELDS = mock.MagicMock()
        self.a.FIELDS.get.return_value = "field_lookup"
        expected = "field_lookup as field_name"
        result = self.a.get_field("field_name")
        self.assertEqual(expected,result)

    def test_and_groupings(self):
        h = {"a":1,"b":2,"c":3}
        self.a.WHERE = mock.MagicMock()
        self.a.WHERE.keys.return_value = ["a","b"]

        expected = {"a":1,"b":2} 
        groupings = self.a.and_groupings(self.a.WHERE, h)
        self.assertEqual(expected,groupings)

    def test_or_groupings(self):
        field = "asdf"
        values = ["1","2"]
        RETURN = "where_field = %(asdf)s"
        self.a.WHERE = mock.MagicMock()
        self.a.WHERE.get.return_value = RETURN

        expected = map(lambda x: "where_field = " + x,values)
        groupings = self.a.or_groupings(self.a.WHERE, field,values)
        self.assertEqual(expected,groupings)

        
    def test_get_meta_data(self):
        DEFAULT_META = {"default":{"meta":{"groups":[]}}}
        self.a.OPTIONS = DEFAULT_META

        expected = {"groups":[]}
        result = self.a.get_meta_data("default")
        self.assertEqual(expected,result)

    def test_missing_meta_data(self):
        self.assertRaises(base.MetaDataException,self.a.get_meta_data, "default")

    def test_get_meta_data_missing_groups(self):
        DEFAULT_META = {"default":{"meta":{"groups":[]}}}
        self.a.OPTIONS = DEFAULT_META 
        # missing groups
        ADDITIONAL_DIMS = ["1","2","3"]
        result = self.a.get_meta_data("default",ADDITIONAL_DIMS)
        self.assertEqual([],result['groups'])
 
    def test_get_meta_data_with_groups(self):
        DEFAULT_META = {"default":{"meta":{"groups":[]}}}
        GROUPS = {"1":"","2":"","3":""}
        self.a.OPTIONS = DEFAULT_META 
        self.a.GROUPS = GROUPS
        # missing groups
        ADDITIONAL_DIMS = ["1","2","3"]
        result = self.a.get_meta_data("default",ADDITIONAL_DIMS)
        self.assertEqual(set(ADDITIONAL_DIMS),set(result['groups']))

    def test_make_params_blank(self):
        GROUPS = []
        FIELDS = []
        WHERE = ""

        values = self.a.make_params(GROUPS,FIELDS,WHERE)
        self.assertEqual(values,{"fields":"","where":"","groups":"","joins":"", "having": "", "limit":""})

    def test_make_params(self):
        self.a.GROUPS = {"g":"1"}
        self.a.FIELDS = {"f":"2"}
        GROUPS = ["g"]
        FIELDS = ["f"]
        WHERE = ""

        values = self.a.make_params(GROUPS,FIELDS,WHERE)
        self.assertEqual(values,{"fields":"1 as g, 2 as f","where":"","groups":"1","joins":"", "having":"", "limit":""})
 
 

def helper(self):
    print self
    return
 

class AdminReportingBaseHandlerTestCase(AsyncHTTPTestCase):
    
    def get_app(self):
        dirname = os.path.dirname(os.path.realpath(__file__)) + "../../../../../templates"
        self.app = Application([('/', base.AdminReportingBaseHandler)],
            cookie_secret="rickotoole",
            template_path=dirname
        )
        return self.app
         
    def tearDown(self):
        pass

    def test_get(self):
        response = self.fetch("/")
        expected = "date>='%(date)s' and date <='%(date)s' and 1=1" % {
            "date": datetime.datetime.now().strftime("%y-%m-%d")
        }
        self.assertEqual(response.body,expected)
            
    def test_start_date(self):
        START_DATE = datetime.datetime.now() - datetime.timedelta(days=7)
        response = self.fetch("/?start_date=%s" % START_DATE.strftime("%y-%m-%d"))
        expected = "date>='%(start_date)s' and date <='%(date)s' and 1=1" % {
            "start_date":START_DATE.strftime("%y-%m-%d"),
            "date":datetime.datetime.now().strftime("%y-%m-%d")
        }
        self.assertEqual(response.body,expected) 

    def test_end_date(self):
        START_DATE = datetime.datetime.now() - datetime.timedelta(days=7)
        END_DATE = datetime.datetime.now() - datetime.timedelta(days=7) 
        response = self.fetch("/?start_date=%s&end_date=%s" % (
            START_DATE.strftime("%y-%m-%d"),
            END_DATE.strftime("%y-%m-%d")
        ))
        expected = "date>='%(start_date)s' and date <='%(end_date)s' and 1=1" % {
            "start_date":START_DATE.strftime("%y-%m-%d"),
            "end_date":END_DATE.strftime("%y-%m-%d")
        }
        self.assertEqual(response.body,expected)  

    def test_where(self):
        with mock.patch.object(base.AdminReportingBaseHandler,"WHERE") as obj:
            obj.keys.return_value = ["test"]
            obj.get.return_value = "x = %(test)s"
            response = self.fetch("/?test=%s" % ("TEST"))
            expected = "date>='%(date)s' and date <='%(date)s' and 1=1 and (x = TEST)" % {
                "date":datetime.datetime.now().strftime("%y-%m-%d")
            }
            self.assertEqual(response.body,expected)   
                
