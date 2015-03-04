import sys
import lib.helpers
import mock
import os
import ujson
sys.path.append("../../../../")

def side_effect(func):
    def inner(*args, **kwargs):
        result = [func()]
        for r in result:
            yield r
    import ipdb; ipdb.set_trace()
    return inner

mocked_deferred = mock.MagicMock()
mocked_deferred.side_effect = side_effect
lib.helpers.decorators = mock.MagicMock()
lib.helpers.decorators.deferred = mocked_deferred

import metrics.handlers.creative
import metrics

from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
from link import lnk

from twisted.internet import defer

import unittest


