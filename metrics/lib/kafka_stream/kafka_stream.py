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
        import json
        space_split = msg.split(" ") 
        quote_split = msg.split("\"")
        url = space_split[1]

        storage = { i:j[0] for i,j in urlparse.parse_qs(url.split("?")[1]).iteritems() }
        storage['ip'] = space_split[-1]
	try:
            storage['referrer'] = quote_split[1]
            storage['user_agent'] = " ".join(quote_split[-1].split(" ")[:-1])
        except:
            pass
        storage['timestamp'] = quote_split[0].split(" ")[-3]

        if not "/20" in storage['timestamp']:
            raise Exception("Timestamp parse: " + storage['timestamp'])

        if "." in storage['ip'] == False:
            raise Exception("IP parse: " + storage['ip'])

        return json.dumps(storage)
    except Exception as e:
        logging.error("Issue parsing: " + str(e.message))
        return ""




if __name__ == "__main__":
    from itertools import takewhile, count
    from sys import stdin
    from options import define, options, parse_command_line

    define("kafka_hosts",type=str,help="",metavar="IP:PORT,...,IP:PORT",default="slave17:9092")
    define("use_marathon",type=bool)
    define("topic",type=str,required=True)
    define("async",type=bool)
    define("use_batch",type=bool)
    define("batch_size",type=int)
    define("batch_time",type=int)
    define("use_parse",type=bool)

    parse_command_line()
     
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
        producer.send_message(msg)
