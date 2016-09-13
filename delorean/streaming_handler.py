from handlers.streaming.streaming import StreamingHandler, clients
from handlers import streaming

import pandas
import helpers

class DeloreanStreamingHandler(StreamingHandler):

    def initialize(self,db=None,buffers={},**kwargs):
        self.time_interval = 1
        super(DeloreanStreamingHandler,self).initialize(db=db,buffers=buffers)

    def build_df(self,key):
        # values: [{"segment":1,"uid":1},{"segment":1,"uid":1}]
        values = self.reset(key)

        if values: return helpers.group_by_segment(values)
            
        return values

  
    def on_message(self, message):        
        try:
            masks = ujson.loads(message)
            streams = masks.get("streams",["segment_log"])
            if streams:
                clients[self.id]['streams'] = streams
                del masks["streams"] 
            clients[self.id]['masks'] = masks
        except:
            pass

        if message.rstrip() == "start":
            streams = ["segment_log"]
            if clients[self.id]:
                clients[self.id]['streams'] = streams
                clients[self.id]['enabled'] = True

        print "Client %s received a message : %s" % (self.id, message)
        


