from ...helpers import *
from ...base import Routes 

class StreamingRoutes(Routes):

    @namespace("/admin")
    @connectors("redis","api","db")
    def streaming_redis(self):
        import handlers.admin.scripts as scripts

        return [
            (r'/advertiser/domain_list/streaming/?', scripts.TargetingHandler, self.connectors)
        ]
         
    @namespace("/admin")
    @connectors("buffers","db")
    def streaming(self):
        import handlers.admin.streaming as streaming


        return [
            (r'/streaming',streaming.IndexHandler, {}),
            (r'/websocket', streaming.AdminStreamingHandler, self.connectors)
        ]
 
