from link import lnk
from handlers import streaming
import lib.hive as h

class ConnectorConfig(object):

    def __init__(self, skip_db=False, skip_reporting_db=False, skip_console_api=False, 
            skip_bidder_api=False, skip_buffers=False, skip_redis=False, skip_hive=False):

        self.connectors = {}

        self.connectors["db"] = lnk.dbs.rockerbox if not skip_db else None
        self.connectors["reporting_db"] = lnk.dbs.reporting if not skip_reporting_db else None

        self.connectors["api"] = lnk.api.console if not skip_console_api else None
        self.connectors["bidder"] = lnk.api.bidder if not skip_bidder_api else None

        self.connectors["hive"] = h.Hive().hive if not skip_hive else None
        self.connectors["redis"] = streaming._redis if not skip_redis else None
        

        if not skip_buffers:
            self.connectors["buffers"] = {
                "track": streaming.track_buffer,
                "view" : streaming.view_buffer,
                "imps" : streaming.imps_buffer
            }                          
        else:
            self.connectors["buffers"] = None
        
 
