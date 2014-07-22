import sys
import mock
import os
sys.path.append("../../../")

import base

from lib.buffered_socket.qs import QSBufferedSocketFactory
from twisted.trial import unittest
from twisted.test import proto_helpers


class QSBufferSocketTestCase(base.SocketTestCase):
    def setUp(self):
        self.tr = proto_helpers.StringTransport()
        self.buf = []
        factory = QSBufferedSocketFactory(self.buf)
        self.proto = factory.buildProtocol(('127.0.0.1', 0),{})
        self.proto.makeConnection(self.tr)

    def _test_buffer(self,line,expected):
        self.assertEqual(len(self.buf),len(expected))
        if len(self.buf):
            self.assertEqual(self.buf[0],expected[0])

    def _clear_buffer(self,line):
        self.buf[:] = []
        return line

    def test_invalid_format(self):
        """
        invalid uri formats should return False 
        they should not be added to the buffer
        """
        init = "?hello=1"
        expected = False
        self.proto.dataReceived("%s\r\n" % (init,))
        self.proto.deferred
        d = self.proto.deferred
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[])
        d.addCallback(self._clear_buffer)

        return d

    def test_process_qs(self):
        """
        should produce a dictionary that has all the params of the query string
        """
        init = "GET ?hello=1"
        expected = {"hello":"1"}
        self.proto.dataReceived("%s\r\n" % (init,))
        d = self.proto.deferred

        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])
        return d

    def test_processors(self):
        """
        extra coverage: test the additional lookup using a processor
        """
        init = "GET ?uid=1"
        expected = {"uid":"1","extra_field":"value"}
        self.proto.set_processors({"uid":{"1":{"extra_field":"value"}}})
        self.proto.dataReceived("%s\r\n" % (init,))
        d = self.proto.deferred
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])
        return d


