import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from lib.kafka_stream import kafka_stream
from link import lnk
import ujson
from classify import LDAClassifier
from classify import BaseClassifier
import time
import logging


def process_message(message, producer, classifier, use_default):
    data = ujson.loads(message.value)
    current_topic = classifier.classify(data['url'], data['title'])
    data['topic'] = current_topic
    producer.send_message(ujson.dumps(data))
    logging.info(data)


if __name__ == '__main__':
    from lib.report.utils.options import define, options, parse_command_line
    from lib.report.utils.loggingutils import basicConfig
    define("csv_location",  default="")
    define("lda_location",  default="")
    define("use_default", type=bool,default=False)
    define("weight_cutoff", default=0.2)
    basicConfig(options={}) 
    parse_command_line()
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['domain_titles']
    producer = kafka_stream.KafkaStream('topic_titles',"slave17:9092",True,False,False,10,1,False)
    consumer = topic.get_simple_consumer()
    if options.use_default:
        classifier = BaseClassifier()
    else:
        classifier = LDAClassifier(options.lda_location, options.weight_cutoff)
    for message in consumer:
        if message is not None:
            process_message(message, producer, classifier, options.use_default)