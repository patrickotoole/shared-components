import logging

if __name__ == "__main__":
    from itertools import takewhile, count
    from sys import stdin, stdout, stderr
    import ujson
    import kafka
    import datetime

    client = kafka.KafkaClient("slave67:9092")
    producer = kafka.SimpleProducer(client, async=False, batch_send=False)
    producer.client.load_metadata_for_topics('application_log')
    print producer.client.has_metadata_for_topic('application_log')
    def fn(x):
        return 0
    producer._next_partition = fn

    input_stream = takewhile(bool, (stdin.readline() for _ in count()))
    for i in input_stream:
        try:
            logging.info(i.replace('\n',""))
            mesos_msg = ujson.loads(i.replace('\n',""))
            mesos_source = (item for item in mesos_msg['marathon_data'] if "MESOS_TASK_ID" in item.keys()).next()
            mesos_app = (item for item in mesos_msg['marathon_data'] if "MARATHON_APP_ID" in item.keys()).next()
            mesos_location= (item for item in mesos_msg['marathon_data']  if "HOST" in item.keys()).next()
            msg = {"source":mesos_location['HOST'] or "", "app_name":mesos_app['MARATHON_APP_ID'] or "", "application" : mesos_source['MESOS_TASK_ID'], "host":mesos_location['HOST'] or "", "short_message":mesos_msg['short_message'] or "", "version":"1.1"}
            producer.send_messages('application_log',ujson.dumps(msg))
        except:
            logging.info("Didnt send")
