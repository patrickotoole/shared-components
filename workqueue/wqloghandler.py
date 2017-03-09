import datetime
import sys
import logging
from logging import Handler 
from logging import StreamHandler 

class CustomLogHandler(StreamHandler):

    def __init__(self, stream=None):
        Handler.__init__(self)
        if stream is None:
            stream = sys.stderr
        self.stream = stream
        self.job_id = ""   

    def customformat(self,record):
        template = '%(asctime)s  %(name)s.%(funcName)s:%(lineno)d  %(job_id)s> %(message)s'
        msg = template % {"asctime":datetime.datetime.fromtimestamp(record.created ).strftime('%Y-%m-%d %H:%M:%S'), "name":record.name, "funcName":record.filename, "lineno":record.lineno, "job_id":self.job_id, "message":record.msg}
        return msg

    def emit(self, record):
        try:
            msg = self.customformat(record)
            stream = self.stream
            fs = "%s\n"
            stream.write(fs % msg)
        except:
            logging.info("error loggin")
