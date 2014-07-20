import sys
import mock
import os
sys.path.append("../../../../")

import unittest
from lib.buffers.buffered_socket.pixel import PixelDeserializer


class PixelDeserializerTestCase(unittest.TestCase):
    def setUp(self):
        self.deserializer = PixelDeserializer()

    def test_update_line(self):
        self.assertRaises(AttributeError,lambda: self.deserializer.qs)
        self.assertRaises(AttributeError,lambda: self.deserializer.formatted)

        self.deserializer.update_line("asdf")
        self.assertEqual(self.deserializer.qs, {})
        self.assertEqual(self.deserializer.formatted, {})

    def test_parse_qs(self):
        self.assertRaises(AttributeError,lambda: self.deserializer.qs)
        self.assertRaises(AttributeError,lambda: self.deserializer.formatted)

        self.deserializer.update_line("asdf=123&bsdf=456")
        self.assertEqual(self.deserializer.qs, {"asdf":"123","bsdf":"456"})
        self.assertEqual(self.deserializer.formatted, {"asdf":"123","bsdf":"456"})

    def test_processors(self):
        self.deserializer.processors = {"asdf":{"123":{"hello":"world"}}} 

        self.deserializer.update_line("asdf=123&bsdf=456")
        formatted = self.deserializer.run_processors()
        
        self.assertEqual(self.deserializer.qs, {"asdf":"123","bsdf":"456"})
        self.assertEqual(self.deserializer.formatted, {"asdf":"123","bsdf":"456","hello":"world"})
        
    def test_deserialize(self):
        self.deserializer.processors = {"asdf":{"123":{"hello":"world"}}} 

        formatted = self.deserializer.deserialize("asdf=123&bsdf=456")
        self.assertEqual(self.deserializer.qs, {"asdf":"123","bsdf":"456"})
        self.assertEqual(self.deserializer.formatted, {"asdf":"123","bsdf":"456","hello":"world"})


    
