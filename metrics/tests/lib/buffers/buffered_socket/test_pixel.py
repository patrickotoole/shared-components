import sys
import mock
import os
sys.path.append("../../../../")

from lib.buffers.buffered_socket.pixel import PixelBufferedSocketFactory
from twisted.trial import unittest
from twisted.test import proto_helpers


class PixelBufferSocketTestCase(unittest.TestCase):
    def setUp(self):
        self.tr = proto_helpers.StringTransport()
        self.buf = []
        factory = PixelBufferedSocketFactory(self.buf)
        self.proto = factory.buildProtocol(('127.0.0.1', 0))
        self.proto.makeConnection(self.tr)

    def _test_buffer(self,line,expected):
        self.assertEqual(len(self.buf),len(expected))
        if len(self.buf):
            self.assertEqual(self.buf[0],expected[0])

    def _clear_buffer(self,line):
        self.buf[:] = []
        return line

    def test_invalid_format(self):
        # too short
        init = "?hello=1"
        expected = False
        d =  self.proto.dataReceived("%s\r\n" % (init,))
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])
        d.addCallback(self._clear_buffer)

        # something else
        d2 =  self.proto.dataReceived("%s\r\n" % (init,))
        d2.addCallback(self.assertEqual, expected)
        d2.addCallback(self._test_buffer,[expected])

        return d2

    def test_process_qs(self):
        init = "GET ?hello=1"
        expected = {"hello":"1"}
        d =  self.proto.dataReceived("%s\r\n" % (init,))
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])
        return d


