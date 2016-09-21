from handlers.streaming.streaming import StreamingHandler, clients
from handlers import streaming

import pandas
import helpers

class DeloreanStreamingHandler(StreamingHandler):

    def initialize(self,db=None,buffers={},**kwargs):
        self.time_interval = 1
        self.db = db
        self.appnexus_names = db.select_dataframe("SELECT appnexus_segment_id as segment, appnexus_name from delorean_segment_view").drop_duplicates().reset_index(drop=True)
        self.appnexus_names['segment'] = self.appnexus_names['segment'].apply(str)
        super(DeloreanStreamingHandler,self).initialize(db=db,buffers=buffers)

    def build_df(self,key):
        # values: [{"segment":1,"uid":1},{"segment":1,"uid":1}]
        values = self.reset(key)

        if values: return helpers.group_by_segment(values, self.appnexus_names)
            
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