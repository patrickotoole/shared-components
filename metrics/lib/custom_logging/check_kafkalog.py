import kafka

from pykafka import KafkaClient

if __name__ == '__main__':
    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['application_log']
    consumer = topic.get_simple_consumer()
    for message in consumer:
        if message is not None:
            print message.value
