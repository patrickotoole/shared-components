import os
import time
import logging
from graphitewriter import graphiteWriter
import socket
import datetime

class TimeMetric():
    def __init__(self, reactor, timer):
        self.reac = reactor
        self.time = timer

    def __call__(self):
        while True:
            time.sleep(0.1)
            self.time.bumpTime(0.1)

SUCCESS_QUERY ="select count(*) from work_queue_log where hostname='{}' and event='Ran' and ts > (select max(ts) from work_queue_log where hostname='{}' and event='Box WQ up')"
ERROR_QUERY = "select count(*) from work_queue_log where hostname='{}' and event='Fail' and ts > (select max(ts) from work_queue_log where hostname='{}' and event='Box WQ up')"
DEQUEUE_QUERY="select count(*) from work_queue_log where hostname='{}' and event='DeQueue' and ts > (select max(ts) from work_queue_log where hostname='{}' and event='Box WQ up')"
class Metrics():
    def __init__(self, reactor, timer, mc, connectors):
        self.reac = reactor
        self.tks = timer
        self.mc = mc
        self.crushercache = connectors['crushercache']
        self.zookeeper = connectors['zookeeper']
        self.hostname = socket.gethostname()

    def getQueueSize(self):
        path_queue = [c for c in self.zookeeper.get_children("/python_queue")]
        self.counter=0
        def parse(x):
            self.counter = self.counter+1
        [parse(path) for path in path_queue]
        return self.counter 

    def __call__(self):
        gw = graphiteWriter()
        hostname =socket.gethostname()
        while True:
            time.sleep(10)
            #time.sleep(15)
            try:
                success = self.mc.getSuccess()
                gw.send("workqueue.{}.successes".format(hostname), success)
                error = self.mc.getError()
                gw.send("workqueue.{}.errors".format(hostname), error)
                dq = self.mc.getDequeue()
                gw.send("workqueue.{}.tasksdequeued".format(hostname), dq)
                size = self.getQueueSize()
                gw.send("workqueue.{}.queuesize".format(hostname), size)
                gw.send("workqueue.{}.up".format(hostname),1)
                index = 0
                for time_keeper in self.tks:
                    gw.send("workqueue.{}.tasks.task{}.time".format(hostname, index), time_keeper.getTime())
                    index = index +1
            except:
                logging.info("Error with graphite logging")
