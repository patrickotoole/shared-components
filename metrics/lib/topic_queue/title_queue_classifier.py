import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from lib.kafka_stream import kafka_stream
from link import lnk
import ujson
from classify import Classifier
import time

if __name__ == '__main__':
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['domain_titles']
    producer = kafka_stream.KafkaStream('topic_titles',"slave17:9092",True,False,False,10,1,False)
    consumer = topic.get_simple_consumer()
    classifier = Classifier()
    for message in consumer:
        if message is not None:
            data = ujson.loads(message.value)
            current_topic = classifier.classify(data['title'])
            data['topic'] = current_topic
            producer.send_message(ujson.dumps(data))
            print data
