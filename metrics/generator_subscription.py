from multiprocessing import Process, Array, Manager, Value
import time

class SubscriptionHandler(object):

    def __init__(self):
        self.manager = Manager()
        self.subscribers = self.manager.dict()
        self.active = self.manager.list()
        self._subscriber_iter = 0

    def _get_registration_id(self, fn):
        subscriber_id = self._subscriber_iter
        subscriber_list = zip(self.subscribers.keys(),self.subscribers.values())
        for k,f in subscriber_list:
            if f == fn:
                subscriber_id = k
                break

        if subscriber_id == self._subscriber_iter:
            self._subscriber_iter += 1
        return subscriber_id

    def register(self,fn):
        subscriber_id = self._get_registration_id(fn)
        print subscriber_id
        self.subscribers[subscriber_id] = fn
        self.active.append(subscriber_id)

    def deregister(self,fn):
        subscriber_id = self._get_registration_id(fn)
        self.active.remove(subscriber_id)

class TimedGenerator(object):

    def __init__(self,genr,dur):
        self.genr = genr
        self.duration = dur
        self.last_time = time.time()

    def next(self):
        if time.time() - self.last_time > self.duration:
            self.last_time = time.time()
            return self.genr.next()
        else:
            return False
            

class GeneratorSubscription(SubscriptionHandler):

    def __init__(self,genr):
        self.genr = genr
        super(GeneratorSubscription,self).__init__()

    def _subprocess_start(self):
        while True:
            batch = self.genr.next()
            for fn_id in self.active:
                self.subscribers[fn_id](batch)

    def start(self):
        p = Process(target=self._subprocess_start).start()

