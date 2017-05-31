import logging
from lib.kafka_stream import kafka_stream
import ujson
import datetime
import sys
import socket

class KafkaHandler(logging.StreamHandler):
    def __init__(self,producer, app_name=""):
        self.kafka = producer
        self.app_name = app_name
        super(KafkaHandler, self).__init__()

    def emit(self, record):
        try:
            time = datetime.datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
            msg = {"version":"1.1", "short_message":record.getMessage(), "source":"chronos","host":socket.gethostbyname(socket.gethostname()), "application":"chronos", "app_name":self.app_name+"."+socket.gethostname(),"location":record.name+"-"+record.pathname+":"+str(record.lineno)}
            self.kafka.send_message(ujson.dumps(msg))
        except (KeyboardInterrupt, SystemExit):
            raise
        except Exception as e:
            self.handleError(record)

if __name__=='__main__':
    producer = kafka_stream.KafkaStream('application_log',"slave17:9092,slave40:9092,slave16:9092",True,False,False,10,1,False)

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
