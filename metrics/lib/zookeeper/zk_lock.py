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
        lock_num = self.__get_lnum__(lock_path)

        all_locks = self.zk.get_children(self.path)
        self.pos = len([i for i in all_locks if self.__get_lnum__(i) < lock_num])

        return lock_path

    def acquire(self):
        import threading
        event = threading.Event()
        self.zk.exists(self.path,event.set)
        event.wait()
        
    def get(self):
        return self.zk.get(self.path)[0]

    def destroy(self):
        self.zk.delete(self.lock_path)

    def __enter__(self):
        if self.pos: self.acquire()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.destroy()
        

if __name__ == "__main__":

    print "hello world"
