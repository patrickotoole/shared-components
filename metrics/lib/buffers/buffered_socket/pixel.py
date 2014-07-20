from base import BufferedSocketBaseFactory, BufferedSocketBase
from deserializer import PixelDeserializer
from lib.helpers import validators

class PixelBufferedSocket(BufferedSocketBase):
    """
    PixelBufferSocket processes pixel data by:
      1. deserializing the query string
      2. converting IP to geo location information
      3. pulling additional user information from redis KV store

    Args:
      buf (array): the buffer that our pixel receiver will append to
      processors (dict of KeyProcessor): additionaly processors to be 
        executed, based on the value of the key, to add addition meta data
        from the qs params of the line being processed

    Attributes:
      buf (array): the buffer that our pixel receiver will append to
      processors (dict): from args
    """

    def __init__(self, buf, processors):
        
        self.buf = buf
        self.set_processors(processors)

    def set_processors(self,value):
        """
        helper method (makes unit testing easier)
        """
        self._processors = value
        self.deserializer = PixelDeserializer(value)

    @validators.pixel
    def process(self,split):
        formatted = self.deserializer.deserialize(split[1])
        return formatted

class PixelBufferedSocketFactory(BufferedSocketBaseFactory):
    """
    PixelBufferedSocketFactor builds a PixelBufferedSocket to process pixel data
    """

    def buildProtocol(self, addr, processors):
        """
        Builds the PixelBufferSocket bound to the appropriate port

        Args:
          addr ((ip_address,port)): ip_address and port to bind to to read data
          processors (dict): additionaly processors to be executed on the which 
            leverage specific keys from the qs params of the line being processed
        
        Returns:
          PixelBufferedSocket: to recurringly parse URI information
        """

        return PixelBufferedSocket(self.buf, processors)
