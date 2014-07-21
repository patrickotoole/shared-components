import sys
import mock
import os
sys.path.append("../../../")

import base

from lib.buffered_socket.base import BufferedSocketBaseFactory
from twisted.trial import unittest
from twisted.test import proto_helpers

class BufferSocketBaseTestCase(base.SocketTestCase):
    def setUp(self):
        self.tr = proto_helpers.StringTransport()
        self.buf = []
        factory = BufferedSocketBaseFactory(self.buf)
        self.proto = factory.buildProtocol(('127.0.0.1', 0))
        self.proto.makeConnection(self.tr)

    def test_append(self):
        """
        # should append to buffer and return value
        """
        value = "hello"
        v = self.proto.append(value)
        self.assertEqual(v, value)
        self._test_buffer(v,[value])

    def test_append_false(self):
        """
        # should not append to buffer and return False
        """
        v = self.proto.append(False)
        self.assertEqual(v,False)
        self.assertEqual(len(self.buf),0)

    def test_append_async(self):
        """
        # should modify buffer async
        """
        init = "hello"
        expected = 'hello'
        self.proto.dataReceived("%s\r\n" % (init,))
        d = self.proto.deferred
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])
        return d

    

    def test_append_multiple(self):
        init = "hello"
        expected = 'hello'
        self.proto.dataReceived("%(i)s\r\n" % {"i":init})
        d = self.proto.deferred
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])

        self.proto.dataReceived("%(i)s\r\n" % {"i":init})
        d2 = self.proto.deferred
        d2.addCallback(self.assertEqual, expected)
        d2.addCallback(self._test_buffer,[expected]*2)
        return d2

    def test_cleared_buffer(self):
        init = "hello"
        expected = 'hello'
        self.proto.dataReceived("%(i)s\r\n" % {"i":init})
        d = self.proto.deferred
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._clear_buffer)
        d.addCallback(self._test_buffer,[])

        return d

    
