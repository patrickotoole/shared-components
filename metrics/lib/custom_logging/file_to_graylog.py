import logging

if __name__ == "__main__":
    from itertools import takewhile, count
    from sys import stdin, stdout, stderr
    import ujson
    import kafka
    import datetime

    logging.basicConfig(
    format='%(asctime)s.%(msecs)s:%(name)s:%(thread)d:%(levelname)s:%(process)d:%(message)s',
    level=logging.DEBUG
    )    
    client = kafka.KafkaClient("slave67:9092")
    producer = kafka.SimpleProducer(client, async=False, batch_send=False)
    producer.client.load_metadata_for_topics('application_log')
    print producer.client.has_metadata_for_topic('application_log')
    def fn(x):
        return 0
    producer._next_partition = fn

    input_stream = takewhile(bool, (stdin.readline() for _ in count()))
    for i in input_stream:
        logging.info(i.replace('\n',""))
        mesos_msg = ujson.loads(i.replace('\n',""))
        mesos_source = (item for item in mesos_msg['marathon_data'] if "MESOS_TASK_ID" in item.keys()).next()
        mesos_app = (item for item in mesos_msg['marathon_data'] if "MARATHON_APP_ID" in item.keys()).next()
        mesos_location= (item for item in mesos_msg['marathon_data']  if "HOST" in item.keys()).next()
        msg = {"source":mesos_source or "", "app_name":mesos_app or "", "location":mesos_location or "", "log_message":mesos_msg['short_message'] or ""}
        try:
            producer.send_messages('application_log',ujson.dumps(msg))
            print "sent"
            logging.info("SENT")
        except:
            logging.info("Didnt send")
