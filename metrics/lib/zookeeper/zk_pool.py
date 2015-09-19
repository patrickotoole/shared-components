import logging
from zk_base import ZKBase
from zk_lock import ZKSimpleLock, ZKMultiLock

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)
logger = logging.getLogger()


class ZKPool(ZKBase):
    """
    For a given zookeeper path with child objects, 
    the child objects to represent objects in the pool. 

    This is an interface to checkout objects from the pool to ensure no two 
    objects are being used at the same time. 
    """

    
    def __init__(self,pool_path="/udf_locks/group_count",host='zk1:2181',zk=None):
        self.pool_path = pool_path
        kwargs = {"zk":zk,"host":host}
        super(ZKPool, self).__init__(**kwargs)

    def __getitems__(self):
        _path = self.path(self.pool_path)
        pool = self.zk.get_children(_path)
        self.__items__ = [self.pool_path + "/" + p for p in pool]

    @property
    def pool(self):
        if not hasattr(self,"__items__"):
            self.__getitems__()
        return self.__items__


    def get_lock(self):
        """
        Returns a lock from the pool based on which object has the shortest pool
        """

        to_clear = []
        best_pos = 100
        best_lock = None

        locks = [ZKSimpleLock(self.zk,path) for path in self.pool]
        return ZKMultiLock(locks)
        
        #for path in self.pool:
        #    lock = ZKSimpleLock(self.zk,path)

        #    if min(lock.pos,best_pos) == lock.pos:
        #        best_pos = lock.pos
        #        to_clear += [best_lock] if best_lock else []
        #        best_lock = lock 
        #    else:
        #        to_clear += [lock]

        #    if lock.pos == 0: break

        #for _lock in to_clear:
        #    _lock.destroy()

        #print best_lock.lock_path
        #return best_lock


if __name__ == "__main__":

    lock = ZKPool()
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path
    print lock.get_lock().lock_path



    import ipdb; ipdb.set_trace() 

    lock.stop()
