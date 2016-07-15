import requests
import logging
from lib.kafka_queue import KafkaQueue
from link import lnk

URL="http://scrapper.crusher.getrockerbox.com?url=%s"

class counter():
    def __init__(self):
        self.counter_dict = {}
    
    def bump(self, url):
        self.counter_dict[url] = self.counter_dict.get(url,0) + 1

    def get(self, url):
        return self.counter_dict.get(url,0)

def run(consumer, count):
    def get(url):
        _resp = requests.get((URL % url), auth=('rockerbox', 'rockerbox'))
        data = _resp.json()
        title = data['result']['title']
        return title

    def send(title, producer):
        msg = {"url":url.encode('ascii',  errors='ignore'), "title": title.encode('ascii', errors='ignore')}
        print str(msg)
        producer.send_message(json.dumps(msg))
        print "Sent"

    for message in consumer:
        if message is not None:
            message_object = json.loads(message.value)
            try:
                url = message_object['bid_request']['bid_info']['url']
                limit = count.get(url)
                count.bump(url)
                if limit ==25:
                    print url
                    title = get(url)
                    send(title, producer)
            except Exception as e:
                print str(e)

if __name__ == '__main__':

    from pykafka import KafkaClient
    from lib.kafka_stream import kafka_stream
    import json
    import datetime
    from itertools import takewhile, count
    from sys import stdin, stderr, stdout
    from lib.report.utils.options import define, options, parse_command_line

    define("kafka_hosts",type=str,help="",metavar="IP:PORT,...,IP:PORT",default="slave17:9092")
    define("use_marathon",type=bool, default=True)
    define("topic",type=str, default='domain_titles')
    define("async",type=bool, default=True)
    define("use_batch",type=bool, default=False)
    define("batch_size",type=int, default=10)
    define("batch_time",type=int, default=1)
    define("use_parse",type=bool, default=False)
    define("test", type=bool, default=False)

    parse_command_line()


    producer = kafka_stream.KafkaStream(
            options.topic,
            options.kafka_hosts,
            options.use_marathon,
            options.async,
            options.use_batch,
            options.batch_size,
            options.batch_time,
            options.use_parse
            )    

    client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
    topic = client.topics['raw_imps']
    consumerA = topic.get_simple_consumer()
    consumerB = topic.get_simple_consumer()
    consumerC = topic.get_simple_consumer()
    consumerD = topic.get_simple_consumer()
    consumers = [consumerA, consumerB, consumerC, consumerD]
    connectors = {"crushercache":lnk.dbs.crushercache}
    
    count = counter()    
    from twisted.internet import threads, reactor
    
    for consum in consumers:
        reactor.callInThread(run, consum, count)
    reactor.run()
