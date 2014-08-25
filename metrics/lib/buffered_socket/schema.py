from qs import QSBufferedSocket, QSBufferedSocketFactory
from lib.helpers import validators

class SchemaBufferedSocket(QSBufferedSocket):
    """
    SchemaBufferSocket processes pixel data by:
      1. deserializing the query string
      2. converting IP to geo location information
      3. pulling additional user information from redis KV store

    Args:
      buf (array): the buffer that our pixel receiver will append to
      schema (array): the schema for the columns passed in
      processors (dict of KeyProcessor): additionaly processors to be 
        executed, based on the value of the key, to add addition meta data
        from the qs params of the line being processed

    Attributes:
      buf (array): the buffer that our pixel receiver will append to
      processors (dict): from args
    """

    def __init__(self, buf, schema, processors, control_buffer):
        
        self.buf = buf
        self.schema = schema
        self.set_processors(processors)
        self.control_buffer = control_buffer

    @validators.pixel
    def process(self,split):
        formatted = dict(zip(self.schema,split))
        return formatted

class SchemaBufferedSocketFactory(QSBufferedSocketFactory):
    """
    SchemaBufferedSocketFactor builds a SchemaBufferedSocket to process pixel data
    """

    def __init__(self,buf, schema, processors={}, control_buffer={}):
        self.buf = buf
        self.processors = processors
        self.schema = schema
        self.control_buffer = control_buffer

    def buildProtocol(self, addr, processors=False):
        """
        Builds the SchemaBufferedSocket bound to the appropriate port

        Args:
          addr ((ip_address,port)): ip_address and port to bind to to read data
          processors (dict): additionaly processors to be executed on the which 
            leverage specific keys from the qs params of the line being processed
        
        Returns:
          SchemaBufferedSocket: to recurringly parse URI information
        """

        self.processors = processors or self.processors
        return SchemaBufferedSocket(self.buf, self.schema, self.processors, self.control_buffer)
