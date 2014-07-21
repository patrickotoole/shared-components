import sys
import mock
import os
sys.path.append("../../")

import unittest
import metrics.lib.buffer as streaming

class BufferTestCase(unittest.TestCase):
    """
    # This should be moved to another location inside of lib testing
    """

    def setUp(self):
        self.buf = []
        self.buffer = streaming.Buffer(self.buf)

    def test_buffer_object(self):
        self.assertTrue(self.buffer.buffer is self.buf)

    def test_buffer_external_mod(self):
        self.buf.append(10)
        self.assertEqual(self.buffer.buffer[0],10)

    def test_buffer_len(self):
        self.buf.append(10)
        self.assertEqual(len(self.buffer),len(self.buf))

    def test_buffer_append_internal(self):
        self.buffer.append(10)
        self.assertEqual(self.buffer.buffer[0],10)

    def test_buffer_copy(self):
        self.assertFalse(self.buffer.copy() is self.buffer.buffer)

    def test_buffer_clear(self):
        self.assertTrue(self.buffer.buffer is self.buf)
        self.assertEqual(len(self.buffer),0)

        self.buffer.append(1)
        self.assertEqual(len(self.buffer),1)

        self.buffer.clear()
        self.assertEqual(len(self.buffer),0)
        self.assertTrue(self.buffer.buffer is self.buf)
        

    def test_buffer_clear_and_copy(self):
        self.buffer.append(0) 
        original_length = len(self.buffer)

        _copy = self.buffer.clear_and_copy()
        copy_length = len(_copy)
        current_length = len(self.buffer)

        self.assertEqual(original_length,copy_length)
        self.assertTrue(original_length > current_length)
        self.assertTrue(copy_length > current_length)

