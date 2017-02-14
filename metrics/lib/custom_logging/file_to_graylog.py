class KafkaStream(object):

    def __init__(self,topic="application_log",
            kafka_hosts="slave62:9092,slave623:9092,slave64:9092", use_marathon=True,async=True,
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
        import requests
        tasks = requests.get("http://master2:8080/v2/apps//docker-kafka").json()['app']['tasks']
        hosts_str = ",".join(["%s:9092" % t['host'] for t in tasks])
        return hosts_str
     
    def connect(self,hosts_str):
        from kafka import KafkaClient, SimpleProducer, common

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


if __name__ == "__main__":
    from itertools import takewhile, count
    from sys import stdin, stdout, stderr
    import ujson
    producer = KafkaStream()
    input_stream = takewhile(bool, (stdin.readline() for _ in count()))
    for i in input_stream:
        pmsg = ujson.loads(i)
        msg = {"source":"mesos", "location":"server1", "timestamp":"2017-01-01 0:0:0", "log_message":pmsg['short_message'].replace('\n',"")}
        print msg
        producer.send_message(ujson.dumps(msg))
