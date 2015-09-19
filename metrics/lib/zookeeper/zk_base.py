import ujson
from kazoo.client import KazooClient

class ZKBase(object):

    MAGIC_PATH = "/%s"
    
    def __init__(self,host='zk1:2181',zk=None):
        if zk:
            self.zk = zk
        else:
            self.zk = KazooClient(hosts=host)
            self.start()
    
    def get_path(self,path):
        """
        used to get value from zk path
        """
        data, stat = self.zk.get(path)
        return data
    
    def create_or_update(self,path,as_json):
        """
         used to create or update zk path
        """
        if self.zk.exists(path):
            return self.zk.set(path,as_json)
        else:
            return self.zk.create(path,as_json)
        
    def start(self):
        self.zk.start() #PRAGMA: start
    
    def stop(self):
        self.zk.stop() #PRAGMA: stop
        
    def path(self,tree_name):
        return self.MAGIC_PATH % tree_name
 



