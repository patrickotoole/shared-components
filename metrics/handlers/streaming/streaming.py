import tornado.websocket
import tornado.web
import copy
import time
import redis
import datetime
import pandas
import ujson
import tornado.platform.twisted
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic

from lib.query.MYSQL import *
from lib.buffers.fields import *
from lib.helpers import Mask, Convert
from lib.buffer import Buffer

clients = dict()

COLUMN_OBJECTS = {
    "debug":DEBUG,
    "result":RESULT,
    "info":INFO
}
COLS = COLUMN_OBJECTS.keys()

def x_in_y(x,y):
    return [z for z in x if z in y]

def mask_data(df,masks):
    if masks and len(df) > 0:
        return df[Mask.isin_mask_dict(df,masks)]
    else:
        return df

class StreamingBase(tornado.websocket.WebSocketHandler):
    
    def merge_brand(self,df):
        return df.merge(self.creatives,how="left",left_on="creative",right_on="id")

    def build_basic(self,values):
        df = pandas.DataFrame(values)
        df = self.merge_brand(df)
        df = df.set_index("auction_id",drop=False)
        df = df.fillna(0)

        return df

    def add_track_columns(self,df,d={}):
        for key,values in d.iteritems():
            columns = x_in_y(values, df.columns)
            as_dict = df[columns].T.to_dict()
            df[key] = pandas.Series(as_dict)
        return df
        
    def build_track(self,values):
        if len(values) == 0:
            return pandas.DataFrame(columns=COLS)

        df = self.build_basic(values)
        df = self.add_track_columns(df,COLUMN_OBJECTS)

        return df

    def build_view(self,values):
        if len(values) == 0:
            return pandas.DataFrame(columns=["result"])

        df = self.build_basic(values)
        df['result'] = pandas.Series(df.T.to_dict())

        return df

    def mask_select_convert(self,df,masks):
        _df = mask_data(df,masks)
        _cols = x_in_y(COLS, _df.columns)
        return Convert.df_to_values(_df[_cols])



class BufferBase(tornado.web.RequestHandler):

    def initialize(self,*args,**kwargs):
        buffers = kwargs.get("buffers",{})
        self.buffers = { key: Buffer(value) for key,value in buffers.iteritems() }

    def reset_buffer(self,name):
        return self.buffers[name].clear_and_copy()

    def get(self):
        buffer_name = self.get_argument("buffer",False)

        if buffer_name:
            values = ",".join(self.reset_buffer(buffer_name))
            self.write(values)

        self.finish()
   


class StreamingHandler(StreamingBase):
  
    def initialize(self,db,track_buffer,view_buffer):
        self.time_interval = 2
        self.db = db
        
        self.creatives = self.db.select_dataframe(BRAND_QUERY)
        self.creatives['id'] = self.creatives.id.map(str)

        self.track_buffer = track_buffer
        self.view_buffer = view_buffer

    def build_track(self):
        values = copy.deepcopy(self.track_buffer)
        self.track_buffer[:] = []
        return super(StreamingHandler, self).build_track(values)

    def build_view(self):
        values = copy.deepcopy(self.view_buffer)
        self.view_buffer[:] = []
        return super(StreamingHandler, self).build_view(values)



    def generator_loop(self):
        start = time.time()

        base = {
            "track": self.build_track(),
            "view": self.build_view()
        }

        for i,client in clients.iteritems():
            if client['enabled'] == False:
                continue

            masks = client.get('masks',False)
            dicts = { key: self.mask_select_convert(df,masks) for key, df in base.iteritems() }
            json = ujson.dumps(dicts)

            try:
                client['object'].write_message(json)
            except:
                client['object'].on_close()
            

        end = time.time()

        if len(clients.keys()) > 0:
            tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=self.time_interval - (end - start)),
                self.generator_loop
            )

    def open(self, *args):
        self.id = self.get_argument("id")
        clients[self.id] = {"id": self.id, "object": self, "enabled":False}
        if len(clients.keys()) == 1:
            self.track_buffer[:] = []
            self.generator_loop()

    def on_message(self, message):        
        try:
            masks = ujson.loads(message)
            clients[self.id]['masks'] = masks
        except:
            pass

        if message == "start":
            clients[self.id]['enabled'] = True

        print "Client %s received a message : %s" % (self.id, message)
        
    def on_close(self):
        if self.id in clients:
            del clients[self.id]

    def on_connection_close(self):
        if self.id in clients:
            del clients[self.id]

        self.connection_closed = True
