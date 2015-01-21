from link import lnk
from handlers import streaming
from lib.kafka_queue import KafkaQueue
import lib.hive as h

import ujson

class ConnectorConfig(object):

    def __init__(self, skip_db=False, skip_reporting_db=False, skip_console_api=False, 
            skip_bidder_api=False, skip_buffers=False, skip_redis=False, include_hive=False,
            skip_filtered_imps=False, skip_conversion_imps=False, skip_conversion_events=False,
            skip_visit_events=False, skip_spark_sql=False):

        self.connectors = {}

        self.connectors["db"] = lnk.dbs.rockerbox if not skip_db else None
        self.connectors["reporting_db"] = lnk.dbs.reporting if not skip_reporting_db else None

        self.connectors["api"] = lnk.api.console if not skip_console_api else None
        self.connectors["bidder"] = lnk.api.bidder if not skip_bidder_api else None
        self.connectors["do"] = lnk.api.digitalocean 
        self.connectors["marathon"] = lnk.api.marathon

        self.connectors["hive"] = h.Hive().hive if include_hive is not False else None

        self.connectors["spark_sql"] = lnk.dbs.hive if not skip_spark_sql else None

        self.connectors["redis"] = streaming._redis if not skip_redis else None
        self.connectors["filtered_imps"] = KafkaQueue(mock_connect=skip_filtered_imps)
        self.connectors["conversion_imps"] = KafkaQueue(
            mock_connect=skip_conversion_imps,topic="conversion_impsw",transform=ujson.loads
        ) 
        self.connectors["conversion_events"] = KafkaQueue(
            mock_connect=skip_conversion_events,topic="conversion_events",transform=ujson.loads
        )
        self.connectors["visit_events"] = KafkaQueue(
            mock_connect=skip_visit_events,topic="visit_events",transform=ujson.loads
        )

        if not skip_buffers:
            self.connectors["buffers"] = {
                "track": streaming.track_buffer,
                "view" : streaming.view_buffer,
                "filtered_imps" : streaming.imps_buffer,
                "conversion_imps": streaming.conversion_imps_buffer,
                "conversion_events": streaming.conversion_events_buffer,
                "visit_events": streaming.visit_events_buffer
            }                          
        else:
            self.connectors["buffers"] = None

 
