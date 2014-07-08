import contextlib
import hive_utils
import requests
import json

@contextlib.contextmanager
def openclose(transport):
    if not getattr(transport, 'keep_open', None):
        transport.open()
    yield
    if not getattr(transport, 'keep_open', None):
        transport.close()

def singleton(cls):
    instances = {}
    def getinstance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return getinstance

@singleton
class Hive(object):
    def __init__(self,marathon_endpoint="http://162.243.2.248:8080/v1/endpoints", n_map=1, n_reduce=1):
        self._hive = self.connect()
        self.marathon_endpoint = marathon_endpoint

        # Sets number of mappers/reducers
        self.n_map = n_map
        self.n_reduce = n_reduce

        
    @property
    def hive(self):
        if self._hive is None:
            self._hive = self.connect()
        # Set all parameters
        self.set_params()
        return self._hive

    def marathon_instance(self):
        resp = requests.get(self.marathon_endpoint, headers={"Accept": "application/json"})
        instances = json.loads(resp.content)

        shark_servers = [ i for i in instances if i["id"] == "shark_server" ]
        server = shark_servers[0]["instances"][0]
        return server

    def connect(self):
        try:
            server = self.marathon_instance()
            return hive_utils.HiveClient(server=server["host"],port=server["ports"][0])
        except:
            return None
    
    def run(self,command='set shark.map.tasks=1; set mapred.reduce.tasks = 1;'):
        with openclose(self._hive._HiveClient__transport):
            self._hive._HiveClient__client.execute(command)

    def set_params(self):
        self.run(command='set shark.map.tasks={}; set mapred.reduce.tasks = {};'.format(self.n_map, self.n_reduce))
