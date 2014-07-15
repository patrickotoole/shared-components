import tornado.websocket
import redis
import datetime
import lib.buffers.stream
import pandas
import ujson
import tornado.platform.twisted
from twisted.internet import  protocol, defer, threads
from twisted.protocols import basic

clients = dict()

class IndexHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        self.render("../templates/admin/index.html")
 

def write(client_id):
    def send(message):
        WebSocketHandler.send_to_websocket(client_id,message)
    return send


BRAND_QUERY = "select external_id id, external_advertiser_id advertiser_id from creative"

RESULT = ["domain","uid","seller","tag","uid","approved_user","creative","advertiser_id","price","city","state","city_state","country","latitude","longitude","auction_id","campaign_id"]
DEBUG = ["second_price", "count", "50%", "$mod", "gross_bid", "biased_bid", "min", "max", "%mod2", "winning_bid", "win_price", "25%", "std", "total", "soft_floor", "75%", "$mod2", "mean", "%mod", "gross_win_price", "second_price_calc"]
INFO = ["brand_id", "result", "pub", "ecp", "ip_address", "referrer", "venue", "debug"]

def mask_from_dict(df,masks):
    if len([ (column,values) for column, values in masks.iteritems()  if column in df.columns]) < len(masks):
        return df.index != df.index

    mask = df.index == df.index
    for column,values in masks.iteritems():
        try:
            values_int = map(int,values)
        except:
            values_int = ["---"]
        mask = mask & (df[column].isin(values) | df[column].isin(values_int))
        
    return mask

class WebSocketHandler(tornado.websocket.WebSocketHandler):
  
    def initialize(self,db,socket_buffer,view_buffer):

        self.time_interval = 2
        self.do = db
        self.socket_buffer = socket_buffer
        self.view_buffer = view_buffer
        self.creatives = self.do.select_dataframe(BRAND_QUERY)
        self.creatives['id'] = self.creatives.id.map(str)

    def build_data(self,value):
        df = pandas.DataFrame(value)
        df = df.merge(
            self.creatives,how="left",left_on="creative",right_on="id"
        ).set_index("auction_id",drop=False)

        df = df.fillna(0)
        debug_columns = [i for i in DEBUG if i in df.columns]
        result_columns = [i for i in RESULT if i in df.columns]
        info_columns = [i for i in INFO if i in df.columns]

        df['debug'] = pandas.Series( df[debug_columns].T.to_dict())
        df['result'] = pandas.Series( df[result_columns].T.to_dict())
        df['info'] = pandas.Series( df[info_columns].T.to_dict())

        return df

    def mask_data(self,df,masks):
        if masks:
            return df[mask_from_dict(df,masks)]
        else:
            return df

                
    def generator_loop(self):
        import copy, time

        track_values = copy.deepcopy(self.socket_buffer)
        self.socket_buffer[:] = []

        view_values = copy.deepcopy(self.view_buffer)
        self.view_buffer[:] = []

        cols = ["debug","info","result"]

        start = time.time()

        track_df_base = self.build_data(track_values) if track_values else pandas.DataFrame(columns=cols)
        view_df_base = pandas.DataFrame(view_values)
        if len(view_df_base) > 0:
            view_df_base = view_df_base.merge(
                self.creatives,how="left",left_on="creative",right_on="id"
            ).set_index("auction_id",drop=False)                        

        for i,client in clients.iteritems():
            if client['enabled'] == False:
                continue

            track_df = track_df_base
            view_df = view_df_base
            masks = client.get('masks',False)

            if len(track_df) > 0:
                track_df = self.mask_data(track_df,masks)

            if len(view_df) > 0:
                view_df = self.mask_data(view_df,masks)

            _df = track_df[cols]

            obj = {}
            obj['track'] = _df.fillna(0).T.to_dict().values()
            obj['view'] = [{"result": v} for v in view_df.fillna(0).T.to_dict().values()]

            json = ujson.dumps(obj).decode('ascii','ignore')
            try:
                client['object'].write_message( json )
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
            self.socket_buffer[:] = []
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
