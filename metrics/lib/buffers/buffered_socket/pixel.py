from base import BufferedSocketBaseFactory, BufferedSocketBase
from lib.helpers import Parse

class PixelBufferedSocket(BufferedSocketBase):
    
    def process(self,line):
        split = line.split(" ")
        if len(split) < 2:
            return False

        return Parse.qs(split[1])

class PixelBufferedSocketFactory(BufferedSocketBaseFactory):

    def buildProtocol(self, addr):                                                                                             
        return PixelBufferedSocket(self.buf)                                                                                        

