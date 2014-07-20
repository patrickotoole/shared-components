from twisted.trial import unittest
from twisted.test import proto_helpers

class SocketTestCase(unittest.TestCase):

    def _test_buffer(self,line,expected):
        self.assertEqual(len(self.buf),len(expected))
        if len(self.buf):
            self.assertEqual(self.buf[0],expected[0])

    def _clear_buffer(self,line):
        self.buf[:] = []
        return line

