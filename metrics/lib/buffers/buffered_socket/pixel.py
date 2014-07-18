from base import BufferedSocketBaseFactory, BufferedSocketBase

class PixelBufferedSocket(BufferedSocketBase):
    
    def process(self,line):
        return line

class PixelBufferedSocketFactory(BufferedSocketBaseFactory):

    def buildProtocol(self, addr):                                                                                             
        return PixelBufferedSocket(self.buf)                                                                                        

