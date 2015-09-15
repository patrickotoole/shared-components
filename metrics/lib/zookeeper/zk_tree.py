import ujson
from kazoo.client import KazooClient

class ZKBase(object):

    MAGIC_PATH = "/%s"
    
    def __init__(self,host='zk1:2181'):
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
 


class ZKTree(ZKBase):
    """
    Directly manages get and set operations for zookeeper path.
    Used to update the tree.
    """

    def __init__(self,host='zk1:2181',tree_name="for_play"):
        
        self.zk = KazooClient(hosts=host)
        self.tree_name = tree_name
        self.start()

    @property
    def tree(self):
        if not hasattr(self,'__tree__'):
            return self.__cache_tree__()
        return self.__tree__  
 
    def __cache_tree__(self):
        """
        used to get tree and then cache results
        """
        self.__tree__ = self.get_tree()
        return self.__tree__
        
    def get_tree(self,tree_name=False):
        """
        Args:
          tree_name: the name of the tree to get (defaults to class tree_name)
        """
        tree_name = tree_name or self.tree_name
        path = self.path(tree_name)
        
        data = self.get_path(path)
        
        tree = ujson.loads(data)
        return tree
    
    
    def set_tree(self,tree_object=False,tree_name=False):
        """
        Args:
          tree_name: the name of the tree to set (defaults to class tree_name)
          tree_object: the python dictionary to set (defaults to class cached_tree)
        """
        tree_object = tree_object or self.tree
        tree_name   = tree_name   or self.tree_name
        path = self.path(tree_name)
        
        as_json = ujson.dumps(tree_object)
        
        self.create_or_update(path,as_json)
            
        return self.get_tree(tree_name)
    
    def find_node_by_label(self,label):
        """
        Args:
          label: the label associated with the top leve node you want to find
          
        Returns:
          the first node from the trees children with a matching label
        """
        for child in self.tree['children']:
            if child['node']['label'] == label:
                return child
