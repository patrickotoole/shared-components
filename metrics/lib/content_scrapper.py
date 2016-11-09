import requests
import logging
from lib.kafka_queue import KafkaQueue
from link import lnk
from twisted.internet import threads
import graphitewriter as gw
import sys
from collections import Counter

URL="http://scrapper.crusher.getrockerbox.com?url=%s"


class GraphiteSender():
    import datetime

    def __init__(self, cs):
        self.GW = gw.GraphiteWriter()
        self.sent_time = datetime.datetime.now() + datetime.timedelta(seconds=10)
        self.cs = cs

    def start(self):
        while True:
            if datetime.datetime.now() > self.sent_time:
                self.sent_time = datetime.datetime.now() + datetime.timedelta(seconds=10)
                with self.GW:
                    self.GW.send("scrapper.content_loop.metrics.pulled_from_kafka", self.cs.get_num_pulled())
                    self.GW.send("scrapper.content_loop.metrics.num_deferred_created", self.cs.get_num_defer())
                    self.GW.send("scrapper.content_loop.metrics.responses_from_scrapper", self.cs.get_num_responses())
                    self.GW.send("scrapper.content_loop.metrics.num_content_added_to_kafka", self.cs.get_num_added())

class GraphiteCounter():
    def __init__(self):
        self.removed_from_kafka = 0
        self.defered_created = 0
        self.response_from_scrapper = 0
        self.sent_to_kafka = 0

    def bump_pulled(self):
        self.removed_from_kafka+=1
    def bump_defer(self):
        self.defered_created+=1
    def deck_defer(self):
        self.defered_created-=1
    def bump_responses(self):
        self.response_from_scrapper+=1
    def bump_added(self):
        self.sent_to_kafka+=1
    def get_num_pulled(self):
        return self.removed_from_kafka
    def get_num_defer(self):
        return self.defered_created
    def get_num_responses(self):
        return self.response_from_scrapper
    def get_num_added(self):
        return self.sent_to_kafka

def run(consumer, count, CS):
    import datetime
    #in_5 = datetime.datetime.now() + datetime.timedelta(minutes = 5)
    def get(url, CS):
        try:
            _resp = requests.get((URL % url), auth=('rockerbox', 'rockerbox'))
            CS.bump_responses()
            data = _resp.json()
            title = data['result']['title']
        except Exception as e:
            print str(e)
            print "could not get title"
            title = None
        CS.deck_defer()
        return (title, url)

    def send(result,  producer, CS):
        title, url = result
        if title is not None:
            msg = {"url":url.encode('ascii',  errors='ignore'), "title": title.encode('ascii', errors='ignore')}
            print str(msg)
            producer.send_message(json.dumps(msg))
            CS.bump_added()
            print "Sent"

    for message in consumer:
        if message is not None:
            CS.bump_pulled()
            message_object = json.loads(message.value)
            try:
                url = message_object['bid_request']['bid_info']['url']
                limit = count.get(url)
                count.update({url})
                if limit ==25:
                    print url
                    defr = threads.deferToThread(get, url, CS)
                    CS.bump_defer()
                    defr.addCallback(send, producer,CS)
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

    define("kafka_hosts",type=str,help="",metavar="IP:PORT,...,IP:PORT",default="slave17:9092,slave40:9092,slave16:9092")
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
    consumer = topic.get_simple_consumer()
    connectors = {"crushercache":lnk.dbs.crushercache}
    
    count = Counter()
    CS = GraphiteCounter()
    GS = GraphiteSender(CS)
    from twisted.internet import reactor
    reactor.callInThread(run, consumer, count, CS)
    reactor.callInThread(GS.start)
    reactor.run()
