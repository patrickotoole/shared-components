import logging

class KafkaStream(object):

    def __init__(self,topic="test_conversions_raw",
            kafka_hosts="slave1:9092", use_marathon=True,async=True,
            batch_send=False, batch_count=30, batch_time=10,use_parse=False,**kwargs):

        self.topic = str(topic)
        self.async = async
        self.batch_count = batch_count
        self.batch_send = batch_send
        self.batch_time = batch_time

        self.use_parse = use_parse

        self.hosts_str = self.marathon_hosts() if use_marathon else kafka_hosts
        self._producer = self.connect(self.hosts_str)

    def __call__(self,_buffer,buffer_control):
        self.populate_buffer(_buffer,buffer_control,transform_message)

    @classmethod
    def marathon_hosts(self):
        from link import lnk

        tasks = lnk.api.marathon.get("/v2/apps//docker-kafka").json['app']['tasks']
        hosts_str = ",".join(["%s:9092" % t['host'] for t in tasks])
        return hosts_str
     
    def connect(self,hosts_str):
        from kafka import KafkaClient, SimpleProducer, common

        logging.info("Kafka connecting: %s" % hosts_str)

        client = KafkaClient(hosts_str)
        producer = SimpleProducer(client, async=self.async, 
                batch_send=self.batch_send, 
                batch_send_every_n=self.batch_count, 
                batch_send_every_t=self.batch_time)
        return producer

    @property
    def producer(self):
        if self._producer:
            return self._producer
        else:
            self._producer = self.connect(self.hosts_str)
            return self._producer

    def send_message(self,msg,retry=0):
        omsg = msg
        try:
            if self.use_parse:
                msg = parse_url(msg)
            self.producer.send_messages(self.topic, msg)
        except Exception as e:
            if retry > 5: raise e
            import time
            time.sleep(1*(retry+1))
            self._producer = self.connect(self.hosts_str)
            self.send_message(omsg,retry+1)

def parse_url(msg):
    omsg = msg
    try:
        import urlparse
        import urllib
        import json
        import socket
        space_split = msg.split(" ") 
        quote_split = msg.split("\"")
        url = space_split[1]

        storage = { i:j[0] for i,j in urlparse.parse_qs(url.split("?")[1]).iteritems() }
        storage['ip'] = space_split[-1]
	try:
            # If we are explicitly being passed a referrer, use that and save
            # the other in request_referrer
            if "an_seg" not in storage:
            	storage['an_seg'] = storage.get("action", 0)
            if "referrer" in storage:
                storage['request_referrer'] = quote_split[1]
                storage['referrer'] = urllib.unquote(storage['referrer'])
            else:
                storage['referrer'] = quote_split[1]

            if "fls.doubleclick.net" in storage['referrer']:
                if "oref" in storage['referrer']:
                    storage['request_referrer'] = storage['referrer']
                    storage['referrer'] = urllib.unquote(storage['referrer'].split("oref=")[1])
                else:
                    storage['request_referrer'] = storage['referrer']
                    storage['referrer'] = storage['pageReferrer']
			
            if "adobedtm.com" in storage['referrer']:
                storage['request_referrer'] = storage['referrer']
                storage['referrer'] = storage['pageReferrer']
		
            if "action" in storage:
                storage['referrer'] = storage['referrer'] + "&action=" + storage["action"]
            storage['user_agent'] = " ".join(quote_split[-1].split(" ")[:-1])
        except:
            pass
        storage['timestamp'] = quote_split[0].split(" ")[-3]

        if not "/20" in storage['timestamp']:
            raise Exception("Timestamp parse: " + storage['timestamp'])

        if "." in storage['ip'] == False:
            raise Exception("IP parse: " + storage['ip'])

        storage['metrics_hostname'] = socket.gethostname()
        return json.dumps(storage)
    except Exception as e:
        logging.error("Issue parsing: " + str(e.message))
        return ""

if __name__ == "__main__":
    from itertools import takewhile, count
    from sys import stdin, stderr, stdout
    from options import define, options, parse_command_line

    define("kafka_hosts",type=str,help="",metavar="IP:PORT,...,IP:PORT",default="slave17:9092,slave16:9092,slave40:9092")
    define("use_marathon",type=bool)
    define("topic",type=str)
    define("async",type=bool)
    define("use_batch",type=bool)
    define("batch_size",type=int)
    define("batch_time",type=int)
    define("use_parse",type=bool)
    define("test", type=bool, default=False)

    parse_command_line()
     

    if not options.test:
        producer = KafkaStream(
            options.topic,
            options.kafka_hosts,
            options.use_marathon,
            options.async,
            options.use_batch,
            options.batch_size,
            options.batch_time,
            options.use_parse
            )

    input_stream = takewhile(bool, (stdin.readline() for _ in count()))
    for i in input_stream:
        msg = i.replace("\n","")
        if not options.test:
            print msg
            producer.send_message(msg)
        else:
            print parse_url(msg)
