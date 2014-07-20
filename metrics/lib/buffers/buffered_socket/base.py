from twisted.protocols import basic
from twisted.internet import protocol, threads

class BufferedSocketBase(basic.LineReceiver):
    """
    BufferedSocketBase accepts new lines and adds them to a buffer. This class 
    is intended to be extended to do more complex manipulations on the data.

    Args:
      buf (array): the buffer that our pixel receiver will append to

    Attributes:
      buf (array): the buffer that our pixel receiver will append to
    """

    def __init__(self,buf):
        self.buf = buf

    def process(self,line):
        """
        Abstract method to be extended. This method will be modified to
        transform the line before it is added to the buffer. 
        """
        to_append = line
        return to_append

    def append(self,line):
        """
        After a line is processed, it is passed to this function and added to
        the buffer. If the value is False, it will not be added to the buffer.

        Args:
          line (?): a value that should be added to the buffer

        Returns:
          line: returns the `line` argument after it is added to the buffer
        """
        if line is not False:
            self.buf += [line]
        return line

    def lineReceived(self, line):
        """
        Receives a line from the socket, processes it and appends it to the 
        buffer. The processing is deferred to a thread as well as the appending
        to the buffer allowing this process to essentially be non-blocking.

        Args:
          line (str): a string that is sent to the socket

        Returns:
          deferred: A deferred object whose argument will be the value added to
            to the buffer.
        """
        d = threads.deferToThread(self.process,line)
        d.addCallback(self.append)
        return d

class BufferedSocketBaseFactory(protocol.Factory):
    """
    BufferedSocketBaseFactory builds a BufferedSocketBase to process received
    lines as they are are sent to a specific port.
    """
    def __init__(self,buf): 
        self.buf = buf 

    def buildProtocol(self, addr): 
        """
        Builds the BufferSocketBase bound to the appropriate port

        Args:
          addr ((ip_address,port)): ip_address and port to bind to to read data
        
        Returns:
          BufferedSocketBase: to recurringly process and append to the shared 
          buffer
        """

        return BufferedSocketBase(self.buf) 

    def set_buffer(self,buf): 
        """
        Sets the buffer to be used by the BufferedSocketBase
        """
        self.buf = buf
