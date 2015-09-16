import ujson
import logging
from zk_base import ZKBase

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)
logger = logging.getLogger()

class ZKLock(ZKBase):

    MAGIC_PATH = "/udf_locks/group_count%s"

    def __init__(self,lock_path="",hosts='zk1:2181'):
        self.lock_path = lock_path
        super(ZKLock, self).__init__(hosts)

    def __getlocks__(self):
        _path = self.path(self.lock_path)
        locks = self.zk.get_children(_path)
        self.__locks__ = [self.lock_path + "/" + p for p in locks]

    @property
    def locks(self):
        if not hasattr(self,"__locks__"):
            self.__getlocks__()
        return self.__locks__

    def path_lnum(self,path):
        return int(path.split("lock-")[1])

    def create_lock(self,path):
        _path = self.path(path + "/lock-")
        value = self.zk.create(_path,ephemeral=True, sequence=True)
        
        lock = self.path_lnum(value)
        all_locks = [ self.path_lnum(i) for i in self.zk.get_children(self.path(path)) if self.path_lnum(i) < lock]

        return (len(all_locks),value)


    def delete_paths(self,paths):
        for path in paths:
            self.zk.delete(path)
    
    def get_lock(self):
        """
        From the locks, get the best one that is available with its position in the queue
        """
        to_clear = []
        best_pos = 100
        best_lock = None

        for i in self.locks:
            lock_pos, location = self.create_lock(i)
            if min(lock_pos,best_pos) == lock_pos:
                best_pos = lock_pos
                to_clear += [best_lock] if best_lock else []
                best_lock = location
            else:
                to_clear += [location]

            if lock_pos ==0: break

        self.delete_paths(to_clear)
        return Lock(self.zk, best_lock, best_pos)

         
        
class Lock:

    def __init__(self,zk,path,pos):
        self.zk = zk
        self.path = path
        self.pos = pos

    def acquire(self):
        import threading
        event = threading.Event()
        self.zk.exists(self.path,event.set)
        event.wait()
        
    def get(self):
        return self.zk.get(self.path)[0]

    def get_parent(self):
        parent = "/".join(self.path.split("/")[:-1])
        return self.zk.get(parent)[0]

    def destroy(self):
        self.zk.delete(self.path)

    def __enter__(self):
        if self.pos: self.acquire()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.destroy()
        

if __name__ == "__main__":

    lock = ZKLock()
    print lock.get_lock()
    print lock.get_lock()
    print lock.get_lock()
    print lock.get_lock()
    print lock.get_lock()
    print lock.get_lock()
    print lock.get_lock()
    print lock.get_lock()



    import ipdb; ipdb.set_trace() 

    lock.stop()
