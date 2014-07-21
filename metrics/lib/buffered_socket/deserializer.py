import copy
from lib.helpers import Parse

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


