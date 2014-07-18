from base import BufferedSocketBaseFactory
from twisted.trial import unittest
from twisted.test import proto_helpers

class BufferSocketBaseTestCase(unittest.TestCase):
    def setUp(self):
        self.tr = proto_helpers.StringTransport()
        self.buf = []
        factory = BufferedSocketBaseFactory(self.buf)
        self.proto = factory.buildProtocol(('127.0.0.1', 0))
        self.proto.makeConnection(self.tr)

    def _test_buffer(self,line,expected):
        self.assertEqual(len(self.buf),len(expected))
        if len(self.buf):
            self.assertEqual(self.buf[0],expected[0])

    def _clear_buffer(self,line):
        self.buf[:] = []
        return line

    def test_append(self):
        init = "hello"
        expected = 'hello'
        d =  self.proto.dataReceived("%s\r\n" % (init,))
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])
        return d

    def test_append_multiple(self):
        init = "hello"
        expected = 'hello'
        d =  self.proto.dataReceived("%(i)s\r\n" % {"i":init})
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._test_buffer,[expected])

        d2 =  self.proto.dataReceived("%(i)s\r\n" % {"i":init})
        d2.addCallback(self.assertEqual, expected)
        d2.addCallback(self._test_buffer,[expected]*2)
        return d2

    def test_cleared_buffer(self):
        init = "hello"
        expected = 'hello'
        d =  self.proto.dataReceived("%(i)s\r\n" % {"i":init})
        d.addCallback(self.assertEqual, expected)
        d.addCallback(self._clear_buffer)
        d.addCallback(self._test_buffer,[])

        return d

    
