import logging
from lib.kafka_stream import kafka_stream
import ujson
import datetime
import sys

class KafkaHandler(logging.StreamHandler):
    def __init__(self,producer):
        self.kafka = producer
        super(KafkaHandler, self).__init__()

    def emit(self, record):
        try:
            time = datetime.datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
            msg = {"log_message":record.getMessage(), "timestamp":time, "location":record.name+"-"+record.pathname+":"+str(record.lineno)}
            self.kafka.send_message(ujson.dumps(msg))
        except (KeyboardInterrupt, SystemExit):
            raise
        except Exception as e:
            self.handleError(record)

if __name__=='__main__':
    producer = kafka_stream.KafkaStream('hindsight_log',"slave17:9092",True,False,False,10,1,False)

    log_object = logging.getLogger()
    log_object.setLevel(logging.DEBUG)


    requests_log = logging.getLogger("kafka")
    requests_log.setLevel(logging.WARNING)


    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.DEBUG)

    #ch2 = KafkaHandler(producer)
    #ch2.setLevel(logging.DEBUG)

    ch2 = KafkaHandler(producer)
    ch2.setLevel(logging.INFO)
 
    log_object.addHandler(ch2)
   
    logging.debug("check it out")
    logging.info("check it out ")
    logging.error("check it out ")
