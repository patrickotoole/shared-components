import sys
import mock
import os
import copy
from tornado.httpclient import HTTPResponse
from tornado.httpclient import HTTPRequest
sys.path.append("../../../../")

from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode

import unittest
import mock
import ujson
from mock import MagicMock, patch
from link import lnk
from metrics.handlers.admin.scripts.delorean import DeloreanHandler

TREE = {
    "pattrenTree": {
        "node": {
            "pattern": "",
            "label": ""
        },
        "children": [
            {
                "node": {
                    "pattern": "",
                    "label": "_lookalike"
                },
                "children": [
                    {
                        "node": {
                        "pattern": "",
                        "label": "testing1"
                        },
                        "children": []
                    },
                    {
                        "node": {
                        "pattern": "",
                        "label": "testing2"
                        },
                        "children": []
                    },
                    {
                        "node": {
                        "pattern": "",
                        "label": "testing3"
                        },
                        "children": []
                    }
                ]
            }
        ]
    }
}

TO_APPEND = { 
    "children": [
        {
            "node": {
                "pattern": "",
                "label": "testing4"
            },
            "children": []
        },
        {
            "node": {
                "pattern": "",
                "label": "testing5"
            },
            "children": []
        }
    ]
}

TO_DELETE = { 
    "children": [
        {
            "node": {
                "pattern": "",
                "label": "testing3"
            },
            "children": []
        }
    ]
}

EXPECTED_APPEND = copy.deepcopy(TREE["pattrenTree"])
EXPECTED_APPEND["children"][0]["children"].extend(TO_APPEND["children"])

EXPECTED_REPLACE = copy.deepcopy(TREE["pattrenTree"])
EXPECTED_REPLACE["children"][0]["children"] = TO_APPEND["children"]

EXPECTED_DELETE = copy.deepcopy(TREE["pattrenTree"])
EXPECTED_DELETE["children"][0]["children"].remove(TO_DELETE["children"][0])

class EmptyObject(object):
    pass
            
class DeloreanHandlerTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test
        self.mock_marathon = mock.MagicMock()

        self.app = Application([
                (r'/delorean/edit/?(.*?)', DeloreanHandler, dict(reporting_db=self.db, marathon=self.mock_marathon))
        ], cookie_secret = "rickotoole" )

        return self.app

    def tearDown(self):
        pass

    @mock.patch.object(DeloreanHandler, 'defer_post_tree', autospec=True)
    @mock.patch.object(DeloreanHandler, 'defer_get_tree', autospec=True)
    def test_append_to_node(self, mock_defer_get_tree, mock_defer_post_tree):
        response = EmptyObject()
        response.body = '"1"'

        mock_defer_get_tree.return_value = TREE
        mock_defer_post_tree.return_value = response

        url = "/delorean/edit/?label=_lookalike&replace=False"
        self.fetch(url, method="POST", body=ujson.dumps(TO_APPEND))

        args,kwargs = mock_defer_post_tree.call_args

        self.assertEqual(EXPECTED_APPEND, args[1])

    @mock.patch.object(DeloreanHandler, 'defer_post_tree', autospec=True)
    @mock.patch.object(DeloreanHandler, 'defer_get_tree', autospec=True)
    def test_replace_node(self, mock_defer_get_tree, mock_defer_post_tree):
        response = EmptyObject()
        response.body = '"1"'

        mock_defer_get_tree.return_value = TREE
        mock_defer_post_tree.return_value = response

        url = "/delorean/edit/?label=_lookalike&replace=True"
        self.fetch(url, method="POST", body=ujson.dumps(TO_APPEND))

        args,kwargs = mock_defer_post_tree.call_args
        self.assertEqual(EXPECTED_REPLACE, args[1])

    @mock.patch.object(DeloreanHandler, 'defer_post_tree', autospec=True)
    @mock.patch.object(DeloreanHandler, 'defer_get_tree', autospec=True)
    def test_delete_from_node(self, mock_defer_get_tree, mock_defer_post_tree):
        response = EmptyObject()
        response.body = '"1"'

        mock_defer_get_tree.return_value = TREE
        mock_defer_post_tree.return_value = response

        url = "/delorean/edit/?label=_lookalike&delete=true"
        r = self.fetch(url, method="POST", body=ujson.dumps(TO_DELETE))

        args,kwargs = mock_defer_post_tree.call_args
        self.assertEqual(EXPECTED_DELETE, args[1])
