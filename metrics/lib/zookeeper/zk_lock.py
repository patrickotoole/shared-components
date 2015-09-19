import logging

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)
logger = logging.getLogger()
        
class ZKSimpleLock:

    def __init__(self,zk,path):
        self.zk = zk
        self.path = path
        self.lock_path = self.create()

    def __get_lnum__(self,path):
        return int(path.split("lock-")[1])

    def create(self):
        _path = self.path + "/lock-"
        lock_path = self.zk.create(_path, ephemeral=True, sequence=True)
        self.lock_num = self.__get_lnum__(lock_path)

        self.refresh()
        return lock_path

    def refresh(self):
        all_locks = self.zk.get_children(self.path)
        self.locks = sorted([self.__get_lnum__(i) for i in all_locks])

        for i,lock in enumerate(self.locks):
            if self.lock_num == lock:
                self.pos = i

        return self.pos


    def __pad__(self,integer):
        pad_by = 10 - len(str(integer))
        padding = "0"*pad_by 
        return padding + str(integer)

    @property
    def min_lock(self):
        padded = self.__pad__(self.locks[0])
        return self.path + "/lock-" + padded


    def acquire(self):
        import threading
        event = threading.Event()
        self.zk.exists(self.min_lock,event.set)
        event.wait()
        
    def get(self):
        return self.zk.get(self.path)[0]

    def destroy(self):
        print self.lock_path
        self.zk.delete(self.lock_path)

    def __enter__(self):
        if self.pos: self.acquire()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.destroy()

class ZKMultiLock:
    """
    Takes a list of locks and waits for the first one to return
    After it receives the first lock, it destorys the rest of the locks
    """

    def __init__(self,locks):
        self.locks = locks

    def available(self):
        return [lock for lock in self.locks if lock.pos == 0]

    def acquired(self,event,lock):
        
        def execute(*args):
            lock.refresh()
            if lock.pos == 0:
                self.acquired_lock = lock
                event.set()
            else:
                lock.zk.exists(lock.min_lock,self.acquired(event,lock))

        return execute

    def acquire_one(self):

        import threading
        event = threading.Event()
        
        for lock in self.locks:
            self.acquired(event,lock)()
            
        event.wait()

        for _l in self.locks:
            if _l != self.acquired_lock: _l.destroy()
         

        return self.acquired_lock

    def __enter__(self):
        lock = self.acquire_one()
        #print self.locks, lock
        return lock
        

    def __exit__(self, exc_type, exc_value, traceback):
        self.acquired_lock.destroy()
        

if __name__ == "__main__":

    print "hello world"
