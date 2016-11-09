import tornado.websocket
import ujson
import os
import logging

import tornado.ioloop
import tornado.web
import tornado.httpserver
import tornado.platform.twisted
import signal
from shutdown import sig_wrap

tornado.platform.twisted.install()

from twisted.internet import reactor
from tornado.options import define, options, parse_command_line

import kafka
from pykafka import KafkaClient
from pykafka.simpleconsumer import OwnedPartition, OffsetType
from lib.kafka_stream import kafka_stream
from link import lnk
from classify import LDAClassifier
from classify import BaseClassifier
import time


dirname = os.path.dirname(os.path.realpath(__file__))

from handler import *



class TitleQueue():
    def __init__(self,classifier_obj):
        self.classifier = classifier_obj.get_obj()

    def __call__(self):
        def process_message(message, producer, classifier):
            data = ujson.loads(message.value)
            current_topic = classifier.classify(data['url'], data['title'])
            data['topic'] = current_topic
            producer.send_message(ujson.dumps(data))
            logging.info(data)
        client = KafkaClient(hosts="10.128.248.211:2181/v0_8_1")
        topic = client.topics['domain_titles']
        producer = kafka_stream.KafkaStream('topic_titles',"slave17:9092,slave16:9092,slave40:9092",True,False,False,10,1,False)
        consumer = topic.get_simple_consumer()
        for message in consumer:
            if message is not None:
                process_message(message, producer, self.classifier)


class ClassifierContainer():

    def __init__(self,classifier):
        self.classifier = classifier

    def get_obj(self):
        return self.classifier

    def change_cutoff(self,weight):
        self.classifier.change_cutoff(weight)

if __name__ == '__main__':
    from lib.report.utils.options import define, options, parse_command_line
    from lib.report.utils.loggingutils import basicConfig
    define("port", default=9001, help="run on the given port", type=int)
    define("log_kafka", default=False, type=bool)
    define("app_name", default="")
    define("csv_location",  default="")
    define("lda_location",  default="")
    define("use_default", type=bool,default=False)
    define("weight_cutoff", default=0.2)
    basicConfig(options={})
    parse_command_line()

    classifier = LDAClassifier(options.lda_location, options.weight_cutoff)

    classifier_obj = ClassifierContainer(classifier)
    connectors = {
        "classifier" :classifier_obj,
        "crushercache":lnk.dbs.crushercache
    }

    routes = [
        (r'/(.*?)', TopicClassifyHandler, connectors)
    ]

    app = tornado.web.Application(
        routes, 
        template_path= dirname,
        debug=True,
        cookie_secret="rickotoole",
        login_url="/login"
    )
    
    reactor.callInThread(TitleQueue(classifier_obj))


    server = tornado.httpserver.HTTPServer(app)
    server.listen(options.port)

    sig_handler = sig_wrap(reactor,server)

    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    tornado.ioloop.IOLoop.instance().start()

