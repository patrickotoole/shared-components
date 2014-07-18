from base import BufferedSocketBaseFactory, BufferedSocketBase

class ViewBufferedSocket(BufferedSocketBase):
    def process(self,line):
        return line

class ViewBufferedSocketFactory(BufferedSocketBaseFactory):

    def buildProtocol(self, addr):                                                                                             
        return ViewBufferedSocket(self.buf)                                                                                        

