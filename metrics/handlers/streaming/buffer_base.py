from lib.buffer import Buffer

class BufferBase(object):

    def initialize(self,*args,**kwargs):
        buffers = kwargs.get("buffers",{})
        self.buffers = { key: Buffer(value) for key,value in buffers.iteritems() }

    def reset(self,name):
        return self.buffers[name].clear_and_copy()

    def inspect(self,name):
        return self.buffers[name].buffer
 
