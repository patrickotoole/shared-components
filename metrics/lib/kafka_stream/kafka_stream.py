import logging

class KafkaStream(object):

    def __init__(self,topic="test_conversions_raw",
            kafka_hosts="slave1:9092", use_marathon=True,async=True,
            batch_send=False, batch_count=30, batch_time=10,**kwargs):

        self.topic = str(topic)
        self.async = async
        self.batch_count = batch_count
        self.batch_send = batch_send
        self.batch_time = batch_time

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

    def send_message(self,msg):
        self.producer.send_messages(self.topic, msg)


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

    parse_command_line()
     
    producer = KafkaStream(
        options.topic,
        options.kafka_hosts,
        options.use_marathon,
        options.async,
        options.use_batch,
        options.batch_size,
        options.batch_time
    )
  
    input_stream = takewhile(bool, (stdin.readline() for _ in count()))
    for i in input_stream:
        msg = i.replace("\n","")
        producer.send_message(msg)
