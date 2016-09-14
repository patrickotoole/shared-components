import logging

ACTIVE_QUEUES = {}

def transform_message(message):
    import ujson
    j = ujson.loads(message)
    obj = dict(j['bid_request']['bid_info'].items() + j['bid_request']['tags'][0].items())
    obj['timestamp'] = str(j['bid_request']['timestamp'])
    obj['sizes'] = j['bid_request']['tags'][0]['sizes']

    # wrangling
    obj['creative'] = 0
    obj['auction_id'] = str(obj['auction_id_64'])
    obj['user_id'] = str(obj['user_id_64'])
    obj['tag_id'] = obj['id'] 
    return obj
 

class KafkaQueue(object):

    def __init__(self,default_hosts="slave16:9092",
            use_marathon=True,topic="filtered_imps",group="some",
            mock_connect=False,transform=transform_message):

        self.topic = topic
        self.group = group
        self.transform = transform

        if not mock_connect:
            self.hosts_str = self.marathon_hosts() if use_marathon else default_hosts
            self._consumer = self.connect(self.hosts_str, self.topic, self.group)
        else:
            from mock import MagicMock
            self._consumer = MagicMock()
            self._consumer.get_message.return_value = None

    def __call__(self,_buffer,buffer_control):
        if self.transform:
            self.populate_buffer(_buffer,buffer_control,self.transform)
        else:
            self.populate_buffer(_buffer,buffer_control)

    @classmethod
    def marathon_hosts(self):
        from link import lnk

        tasks = lnk.api.marathon.get("/v2/apps//docker-kafka").json['app']['tasks']
        hosts_str = ",".join(["%s:9092" % t['host'] for t in tasks])
        return hosts_str

     
    @classmethod
    def connect(self,hosts_str,topic,group):
        from kafka import KafkaClient, SimpleConsumer, common
        try:
            logging.info("Kafka connecting: %s for %s" % (hosts_str,topic))
            
            client = KafkaClient(hosts_str,timeout=10)
            consumer = SimpleConsumer(client, group, topic, max_buffer_size=4096*1024*10, auto_commit_every_n=15000, auto_commit_every_t=15000)
            return consumer
        except Exception as e:
            import time
            logging.error(e)
            logging.error("Sleeping 5 seconds before attempting reconnect...")
            time.sleep(5)
            return self.connect(hosts_str,topic,group)


    @property
    def consumer(self):
        if self._consumer:
            return self._consumer
        else:
            self._consumer = self.connect(self.hosts_str,self.topic,self.group)
            return self._consumer


    def populate_buffer(self,_buffer,buffer_control,transform=lambda x: x):
        import time
        import datetime
        consumer = self.consumer
        repeated_failure = 0 
        while True:
            try:

                message = consumer.get_message(True,1)
                if message is None:
                    time.sleep(1)
                    continue
                logging.debug(message.message.value)
                if buffer_control['on']:
                    obj = transform(message.message.value)
                    _buffer += [obj]
                ACTIVE_QUEUES[self.topic] = datetime.datetime.now()


            except Exception as e:

                logging.error(e)
                repeated_failure += 1
                ACTIVE_QUEUES[self.topic] = 0
                if repeated_failure > 5:
                     time.sleep(1)
                     self._consumer = self.connect(self.hosts_str, self.topic, self.group)
                     self._consumer
                     repeated_failure = 0
     



def get_partitions(client,topic):
    return client.topic_partitions[topic]


def update_partitions(kafka,topic,consumer):
    import time
    from kafka import common
    
    partitions = get_partitions(kafka,topic)
    ti = int(time.time()*1000)
    for partition in partitions:

        offset_req = common.OffsetRequest(topic,partition,ti,2147483647)
        offsets = kafka.send_offset_request([offset_req])
        offset_min = offsets[0]
        offset_max = offsets[-1]


        offset_req_group = common.OffsetFetchRequest(topic,partition)
        offset_cur = kafka.send_offset_fetch_request([offset_req_group])

    
        print offset_min, offset_cur, offset_max 
        if offset_min <= offset_cur <= offset_max:
            consumer.offsets[partition] = offset_cur.offsets[0]
        else:
            consumer.offsets[partition] = offset_min.offsets[0]

    print consumer.offsets
    consumer.commit() 
