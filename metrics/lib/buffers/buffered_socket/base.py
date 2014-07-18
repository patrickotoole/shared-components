from twisted.protocols import basic
from twisted.internet import protocol, threads

class BufferedSocketBase(basic.LineReceiver):
    def __init__(self,buf):
        self.buf = buf

    def process(self,line):
        to_append = line
        return to_append

    def append(self,line):
        self.buf += [line]
        return line

    def lineReceived(self, line):
        d = threads.deferToThread(self.process,line)
        d.addCallback(self.append)
        return d

class BufferedSocketBaseFactory(protocol.Factory):                                                                                 
                                                                                                                               
    def __init__(self,buf):                                                                                                    
        self.buf = buf                                                                                                         
                                                                                                                               
    def buildProtocol(self, addr):                                                                                             
        return BufferedSocketBase(self.buf)                                                                                        
                                                                                                                               
    def set_buffer(self,buf):                                                                                                  
        self.buf = buf  
