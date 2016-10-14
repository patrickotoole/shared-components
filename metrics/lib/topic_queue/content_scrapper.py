import requests
import logging
from lib.kafka_queue import KafkaQueue
from link import lnk
from twisted.internet import threads
import graphitewriter as gw
import sys
from collections import Counter
import socket
import numpy as np
import pycurl

URL="http://scrapper.crusher.getrockerbox.com?url=%s"

class GraphiteSender():
    import datetime

    def __init__(self, cs):
        self.GW = gw.GraphiteWriter()
        self.sent_time = datetime.datetime.now() + datetime.timedelta(seconds=10)
        self.cs = cs
        self.hostname = socket.gethostname()

    def start(self):
        while True:
            if datetime.datetime.now() > self.sent_time:
                self.sent_time = datetime.datetime.now() + datetime.timedelta(seconds=10)
                with self.GW:
                    self.GW.send("imps_to_title.{}.metrics.pulled_from_kafka".format(self.hostname), self.cs.get("kafka_remove"))
                    self.GW.send("imps_to_title.{}.metrics.num_deferred_created".format(self.hostname), self.cs.get("defer_create"))
                    self.GW.send("imps_to_title.{}.metrics.responses_from_scrapper".format(self.hostname), self.cs.get("response"))
                    self.GW.send("imps_to_title.{}.metrics.num_content_added_to_kafka".format(self.hostname), self.cs.get("kafka_send"))
                    self.GW.send("imps_to_title.{}.metrics.num_urls_reach_limit".format(self.hostname), self.cs.get("url_limit_reached"))

class GraphiteCounter():
    def __init__(self):
        self.counter_dict = {"kafka_remove":0, "kafka_send":0, "defer_create":0, "response":0,"url_limit_reached":0}
    def bump(self, what_to_bump):
        self.counter_dict[what_to_bump]+=1
    def deck(self, what_to_dek):
        self.counter_dict[what_to_dek]-=1
    def get(self, what_to_get):
        return self.counter_dict[what_to_get]

class ScrapperMessage():

    def __init__(self, counter_obj, graphite_counter, producer):
        self.count = counter_obj
        self.CS = graphite_counter
        self.producer = producer
        self.scrapper_boxes = self.get_scrapper_boxes()
        self.count_box_query = 0

    def get_scrapper_boxes(self):
        list_of_servers = []
        _resp = requests.get('http://master2:8080/v2/apps/apps/scrapper/tasks')
        data = _resp.json()['tasks']
        for item in data:
            temp = "http://{}:{}".format(str(item['host']),str(item['ports'][0]))
            list_of_servers.append(temp) 
        return list_of_servers

    def get_host(self):
        return np.random.choice(self.scrapper_boxes,1)[0]

    def get(self,url):
        try:
            URL = self.get_host() + "/?url=%s"
            logging.info(URL % url)
            url_with_param = URL % url
            _resp = requests.get(url_with_param, timeout=3)
            self.CS.bump("response")
            data = _resp.json()
            title = data['result']['title']
        except Exception as e:
            logging.info(str(e))
            logging.info("could not get title")
            title = None
        self.CS.deck("defer_create")
        self.count_box_query+=1
        if self.count_box_query>=100:
            self.scrapper_boxes=self.get_scrapper_boxes()
            self.count_box_query =0
        return (title, url)

    def get_without_scrapper(self,url):
        self.CS.bump("response")
        self.CS.deck("defer_create")
        return ("No title", url)

    def send(self,result):
        title, url = result
        if title is not None:
            msg = {"url":url.encode('ascii',  errors='ignore'), "title": title.encode('ascii', errors='ignore')}
            logging.info(str(msg))
            self.producer.send_message(json.dumps(msg))
            self.CS.bump("kafka_send")
            logging.info("Sent")

    def proccess_message(self, message, use_scrapper):
        self.CS.bump("kafka_remove")
        message_object = json.loads(message.value)
        try:
            url = message_object['bid_request']['bid_info']['url']
            limit = count.get(url)
            count.update({url})
            if limit ==5:
                logging.info(url)
                self.CS.bump("url_limit_reached")
                if use_scrapper:
                    defr = threads.deferToThread(self.get, url)
                else:
                    defr = threads.deferToThread(self.get_without_scrapper, url)
                self.CS.bump("defer_create")
                defr.addCallback(self.send)
        except Exception as e:
            logging.info(str(e))

def run(consumer, count, CS, producer, use_scrapper):
    SM = ScrapperMessage(count, CS, producer)
    for message in consumer:
        if message is not None:
            SM.proccess_message(message, use_scrapper)

if __name__ == '__main__':

    logging.basicConfig(stream=sys.stdout, level=logging.INFO)

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
    define("use_scrapper", type=bool, default=True)

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
    
    use_scrapper = options.use_scrapper
    count = Counter()
    CS = GraphiteCounter()
    GS = GraphiteSender(CS)
    from twisted.internet import reactor
    reactor.callInThread(run, consumer, count, CS, producer, use_scrapper)
    reactor.callInThread(GS.start)
    reactor.run()
