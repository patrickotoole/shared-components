import sys
import mock
import os
from os.path import dirname, realpath
sys.path.append(dirname(realpath(__file__)) + "/../../..")


import unittest
import metrics.handlers.streaming.buffer_base as buffer


class BufferBaseTest(unittest.TestCase):
    
    def setUp(self):
        self.buf = ["1","2","3"]
        buffers = {"x":self.buf}

        self.buffer = buffer.BufferBase()
        self.buffer.initialize(buffers=buffers)

    def test_reset(self):
        expected = ",".join(self.buf)
        response = ",".join(self.buffer.reset("x"))
        print response == expected

        self.assertEqual(response,expected)

    def test_inspect(self):
        self.buf.append("123")
        expected = ",".join(self.buf)
        response = ",".join(self.buffer.inspect("x"))
        self.assertEqual(expected,response)


    def test_check_cleared(self):
        self.buffer.reset("x")
        response = ",".join(self.buffer.inspect("x"))
        self.assertEqual(response,"")



