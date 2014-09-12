import contextlib
import hive_utils
import requests
import json
from twisted.internet import threads

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

class CustomHiveClient(hive_utils.HiveClient):
    def __init__(self, server='localhost', port=10001, db='default'):
        super(CustomHiveClient, self).__init__(server, port, db)

    def session_execute(self,commands,*args,**kwargs):
        """Execute a HiveQL command.

        Returns a generator which pulls in a buffered manner

        """
        with self.session():
            for c in commands:
                self._HiveClient__client.execute(c, *args, **kwargs)

            # get names for the fields
            schema = self._HiveClient__client.getThriftSchema()
            stypes = []
            for schema in schema.fieldSchemas:
                stypes.append(schema.name)


            while True:
                # used buffered read, thrift no likey big reads
                rows = self._HiveClient__client.fetchN(500)

                if not len(rows):
                    break

                for row in rows:
                    # map names to values.  ordering is not preserved
                    yield dict(zip(stypes,row.split('\t')))

@singleton
class Hive(object):
    def __init__(self,marathon_endpoint="http://dev.marathon.getrockerbox.com:8080/v2/tasks", n_map=1, n_reduce=1):
        self.marathon_endpoint = marathon_endpoint
        self._hive = self.connect()

        # Sets number of mappers/reducers
        self.n_map = n_map
        self.n_reduce = n_reduce
        print self.n_map



    @property
    def hive(self):
        if self._hive is None:
            self._hive = self.connect()
        # Set all parameters
        self.set_params()
        return self._hive

    def marathon_instance(self):
        resp = requests.get(self.marathon_endpoint, headers={"Accept": "application/json"})
        instances = json.loads(resp.content)['tasks']
        print instances
        shark_servers = [ i for i in instances if i["appId"] == "/shark-server-debug" ]
        print shark_servers
        server = shark_servers[0]
        return server
       


    def connect(self):
        try:
            server = self.marathon_instance()
            print server
            hive = CustomHiveClient(server=server["host"],port=server["ports"][0])
            return hive
        except:
            return None

    def run(self,command='set shark.map.tasks=1; set mapred.reduce.tasks = 1;'):
        with openclose(self._hive._HiveClient__transport):
            result = self._hive._HiveClient__client.execute(command)
        return result


    def set_params(self):
        self.run(command='set shark.map.tasks={}; set mapred.reduce.tasks = {};'.format(self.n_map, self.n_reduce))

