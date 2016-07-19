import requests
import logging
from lib.kafka_queue import KafkaQueue
from link import lnk
from twisted.internet import threads

URL="http://scrapper.crusher.getrockerbox.com?url=%s"

class counter():
    def __init__(self):
        self.counter_dict = {}
    
    def bump(self, url):
        self.counter_dict[url] = self.counter_dict.get(url,0) + 1

    def get(self, url):
        return self.counter_dict.get(url,0)

class countSend():
    #add metrics to graphite
    #and log num deffers, num finished, num pulled, etc.
    def __init__(self):
        self.sent = 0
        self.pulled=0

    def pull(self):
        self.pulled=self.pulled+1
    def send(self):
        self.sent = self.sent+1
    def getpull(self):
        return self.pulled
    def getsent(self):
        return self.sent

def run(consumer, count):
    CS = countSend()
    import datetime
    in_5 = datetime.datetime.now() + datetime.timedelta(minutes = 0.5)
    def get(url):
        _resp = requests.get((URL % url), auth=('rockerbox', 'rockerbox'))
        data = _resp.json()
        try:
            title = data['result']['title']
        except:
            print "could not get title"
            title = None
        return (title, url)

    def send(result,  producer, CS):
        title, url = result
        if title is not None:
            msg = {"url":url.encode('ascii',  errors='ignore'), "title": title.encode('ascii', errors='ignore')}
            print str(msg)
            producer.send_message(json.dumps(msg))
            CS.send()
            print "Sent"

    for message in consumer:
        if message is not None:
            CS.pull()
            if datetime.datetime.now() > in_5:
                print "Pulled: "+ str(CS.getpull())
                print "Sent: "+ str(CS.getsent())
                break
                raise Exception
            message_object = json.loads(message.value)
            try:
                url = message_object['bid_request']['bid_info']['url']
                limit = count.get(url)
                count.bump(url)
                if limit ==25:
                    print url
                    defr = threads.deferToThread(get, url)
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
    consumer = topic.get_simple_consumer()
    connectors = {"crushercache":lnk.dbs.crushercache}
    
    count = counter()    
    from twisted.internet import reactor
    
    reactor.callInThread(run, consumer, count)
    reactor.run()
