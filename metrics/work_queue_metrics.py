import os
import time
import logging
from graphitewriter import graphiteWriter
import socket
import datetime

class TimeMetric:
    def __init__(self, reactor, timer):
        self.reac = reactor
        self.time = timer

    def __call__(self):
        while True:
            logging.info(self.time.getTime())
            time.sleep(0.1)
            self.time.bumpTime(1)

SUCCESS_QUERY ="select count(*) from work_queue_log where hostname='{}' and event='Ran' and ts >= '{}'"
ERROR_QUERY = ""
DEQUEUE_QUERY=""
class Metrics:
    def __init__(self, reactor, timer, connectors):
        self.reac = reactor
        self.time = timer
        self.crushercache = connectors['crushercache']
        self.hostname = socket.gethostname()

    def getSuccess(self):
        lasthour = datetime.datetime.now() - datetime.timedelta(hours = 1)
        lasthour = lasthour.strftime("%Y-%m-%d %H:%M:%S")
        data = self.crushercache.select_dataframe(SUCCESS_QUERY.format(self.hostname, lasthour))
        return data["count(*)"][0]
    
    def getError(self):
        lasthour = datetime.datetime.now() - datetime.timedelta(hours = 1)
        lasthour = lasthour.strftime("%Y-%m-%d %H:%M:%S")
        data = self.crushercache.select_dataframe(ERROR_QUERY.format(self.hostname, lasthour))
        return data["count(*)"][0]

    def getDequeue(self):
        lasthour = datetime.datetime.now() - datetime.timedelta(hours = 1)
        lasthour = lasthour.strftime("%Y-%m-%d %H:%M:%S")
        data = self.crushercache.select_dataframe(DEQUEUE_QUERY.format(self.hostname, lasthour))
        return data["count(*)"][0]

    def getQueueSize(self):
        crusher.base_url = "http://portal.getrockerbox.com"
        crusher.get('/admin/work_queue/updates/num',timeout=5)
        num = data.json['number']
        return num

    def __call__(self):
        gw = graphiteWriter()
        hostname =socket.gethostname()
        while True:
            time.sleep(10)
            #time.sleep(15)
            gw.write("servers.{}.workqueue.tasktime".format(hostname), self.time.getTime())
            success = self.getSuccess()
            gw.write("servers.{}.workqueue.successes".format(hostname), success)
            error = self.getError()
            gw.write("servers.{}.workqueue.errors".format(hostname), error)
            dq = self.getDequeue()
            gw.write("servers.{}.workqueue.tasksdequeued".format(hostname), dq)
            size = self.getQueueSize()
            gw.write("servers.{}.workqueue.queuesize".format(hostname), size)
