import sys
import mock
import os
sys.path.append("../../../")

import base

from lib.buffered_socket.schema import SchemaBufferedSocketFactory
from twisted.trial import unittest
from twisted.test import proto_helpers


class SchemaBufferSocketTestCase(base.SocketTestCase):
    def setUp(self):
        self.tr = proto_helpers.StringTransport()
        self.buf = []
        schema = ["domain", "imps"]
        factory = SchemaBufferedSocketFactory(self.buf, schema)
        self.proto = factory.buildProtocol(('127.0.0.1', 0),{})
        self.proto.makeConnection(self.tr)

    def test_schema(self):
        """
        """
        init = "hello 1"
        expected = {"domain":"hello","imps":'1'}
        self.proto.dataReceived("%s\r\n" % (init,))
        d = self.proto.deferred
        d.addCallback(self.assertEqual, expected)
        return d

    
