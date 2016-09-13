import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from lib.kafka_stream import kafka_stream
from link import lnk
import ujson
from classify import LSIClassifier
import time
import logging


def process_message(message, producer, classifier):
    data = ujson.loads(message.value)
    current_topic = classifier.classify(data['url'], data['title'])
    data['topic'] = "-".join(current_topic)
    producer.send_message(ujson.dumps(data))
    logging.info(data)


if __name__ == '__main__':
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['domain_titles']
    producer = kafka_stream.KafkaStream('topic_titles',"slave17:9092",True,False,False,10,1,False)
    consumer = topic.get_simple_consumer()
    classifier = LSIClassifier(options.csv_location, options.lsi_location)
    for message in consumer:
        if message is not None:
            process_message(message, producer, classifier)
