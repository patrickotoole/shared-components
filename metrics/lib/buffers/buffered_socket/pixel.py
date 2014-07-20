import copy
from base import BufferedSocketBaseFactory, BufferedSocketBase
from lib.helpers import Parse, validators

class KeyProcessor(object):
    """
    KeyProcessor is an abstract class that has a standard accessor pattern
    to return a hash based on some value. 

    Basically, its just a glorified dictionary but will use this format for
    more complex lookup schemas like redis and maxmindDB (for geolocation)
    """

    def get(self,value,default={}):
        """
        Abstract method to get more information base on an input value.

        Args:
          value (string): to use in the lookup
          default (dict): to use if lookup fails

        Returns:
          dict
        """
        return default

class RedisApprovedUID(KeyProcessor):
    """
    RedisApprovedUID looks up user specific information base on the UID and
    returns a dictionary object with information related to the user.

    Args:
      redis_list: a list of redis connectors to check for users information
    """

    def __init__(self,redis_list):
        self.redis_list = redis_list

    def get(self,value):
        """
        Look up to see if the value exists across multiple redis servers

        Args:
          value (string): value to lookup on each redis server

        Returns:
          dict: describes whether the user is approved or not
        """
        result = {}
        for redis_server in self.redis_list:
            result["approved_user"] = result["approved_user"] or redis_server.get(value,False)
        return result


class PixelDeserializer(object):
    """ 
    Pixel deserializer takes a URI path, converts IP to geolocation and looks up 
    user information from twitter.

    Args:
      processors (dict or KeyProcessors, optional): uses a key from the 
        standard qs to augment the formatted result with additional fields. Needs 
        to have get method defined
      line (string, optional): uri from the pixel with various pieces of information

    Attributes:
      qs (dict): dictionary of parsed query string values
      formatted (dict): collection dictionary to place deserialized values
      processors (dict): from arguments
    """

    def __init__(self,processors={},line=None):
        if line:
            self.update_line(line)
        self.processors = processors

    def update_line(self,line):
        self.qs = Parse.qs(line)
        self.formatted = copy.copy(self.qs)
        
    def run_processors(self):
        """
        Runs the processors and appends the results to the formatted dict
        """
        for key,processor in self.processors.iteritems():
            value = self.formatted.get(key,False)
            result = {}
            if value:
                result = processor.get(value)

            for k,v in result.iteritems():
                self.formatted[k] = v

        return self.formatted

    def deserialize(self,line=None):
        """
        Runs all the parsers to produce a formatted output
        
        Args:
          line (str, optional): line to be set and processed, will use previous
            value if no line is set
        
        Returns:
          dict: formatted collection of deserialized values
        """
        if line:
            self.update_line(line)

        self.run_processors()
        return self.formatted

        

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
