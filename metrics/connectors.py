from link import lnk
from handlers import streaming
from lib.kafka_queue import KafkaQueue
import lib.hive as h
import logging
from kazoo.client import KazooClient

logger = requests_log = logging.getLogger("connectors")

import ujson
import mocks.yoshi
import mocks.cassandra

class ConnectorConfig(object):

    def __init__(self, skip_db=False, skip_reporting_db=False, skip_console_api=False, 
            skip_bidder_api=False, skip_buffers=False, skip_redis=False, include_hive=False,
            skip_filtered_imps=False, skip_conversion_imps=False, skip_conversion_events=False,
            skip_visit_events=False, skip_spark_sql=False, skip_cassandra=False, skip_mongo=False,
            skip_marathon=False, skip_zookeeper=False, include_crusher_api=False):

        self.connectors = {}

        self.connectors["db"] = lnk.dbs.rockerbox if not skip_db else mocks.mysql.DB
        self.connectors['crushercache'] = lnk.dbs.crushercache if not skip_db else mocks.mysql.DB
        self.connectors["reporting_db"] = lnk.dbs.reporting if not skip_reporting_db else None
        self.connectors["crusher_wrapper"] = lnk.api.crusher if include_crusher_api is not False else None

        self.connectors["api"] = lnk.api.console if not skip_console_api else mocks.yoshi.API
        self.connectors["bidder"] = lnk.api.bidder if not skip_bidder_api else None
        self.connectors["do"] = lnk.api.digitalocean if not skip_console_api else None
        self.connectors["marathon"] = lnk.api.marathon if not skip_marathon else None

        try:
            self.connectors["cassandra"] = lnk.dbs.cassandra if not skip_cassandra else mocks.cassandra.CASSANDRA
        except:
            print "Cassandra not connected"
            logging.error("Cassandra not connected")
            raise Exception("Cassandra not connected")

        self.connectors["hive"] = h.Hive().hive if include_hive is not False else None
        self.connectors["spark_sql"] = lnk.dbs.hive if not skip_spark_sql else None
        self.connectors["redis"] = streaming._redis if not skip_redis else None
        self.connectors["mongo"] = lnk.dbs.mongo if not skip_mongo else None
        self.connectors["zookeeper"] = KazooClient(hosts="zk1:2181")  if not skip_zookeeper else None

        self.connectors["zookeeper"].start() if not skip_zookeeper else None
 

        if not skip_buffers:
            try:
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
                self.connectors["served_imps"] = KafkaQueue(
                    mock_connect=skip_visit_events,topic="served_imps",transform=ujson.loads
                )

                self.connectors["raw_imps_tree"] = KafkaQueue(
                    mock_connect=skip_visit_events,topic="raw_imps_tree",transform=ujson.loads
                )

                self.connectors["raw_imps_tree_2"] = KafkaQueue(
                    mock_connect=skip_visit_events,topic="raw_imps_tree_2",transform=ujson.loads
                )

                self.connectors["conversion_events_tree"] = KafkaQueue(
                    mock_connect=skip_visit_events,topic="conversion_events_tree",transform=ujson.loads
                )

                self.connectors["visit_events_tree"] = KafkaQueue(
                    mock_connect=skip_visit_events,topic="visit_events_tree",transform=ujson.loads
                )

                self.connectors["served_imps_tree"] = KafkaQueue(
                    mock_connect=skip_visit_events,topic="served_imps_tree",transform=ujson.loads
                )
                self.connectors["hindsight_log"] =  KafkaQueue(
                    mock_connect=False, topic="hindsight_log",transform=ujson.loads
                )




                self.connectors["buffers"] = {
                    #"track": streaming.track_buffer,
                    #"view" : streaming.view_buffer,
                    "filtered_imps" : streaming.imps_buffer,                   # yoshi
                    "conversion_imps": streaming.conversion_imps_buffer,       # hoverboard
                    "conversion_events": streaming.conversion_events_buffer,
                    "visit_events": streaming.visit_events_buffer,
                    "served_imps": streaming.served_buffer,
                    "raw_imps_tree": streaming.raw_imps_tree_buffer,           # delorean
                    "raw_imps_tree_2": streaming.raw_imps_tree_2_buffer,           # delorean
                    "conversion_events_tree": streaming.conversion_events_tree_buffer,
                    "visit_events_tree": streaming.visit_events_tree_buffer,
                    "served_imps_tree": streaming.visit_events_tree_buffer,
                    "hindsight_log": streaming.hindsight_log_buffer
                }
            except Exception as e:
                logging.error("One or more buffers not connected", e)
                print "One or more buffers not connected"
                self.connectors["buffers"] = None
        else:
            self.connectors["buffers"] = None

 
