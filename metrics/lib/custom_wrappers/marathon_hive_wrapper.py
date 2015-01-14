import signal
import logging
import hive_utils
from link.wrappers import Hive2DB, Hive2Cursor, DBConnectionWrapper

class timeout:
    def __init__(self, seconds=1, error_message='Timeout'):
        self.seconds = seconds
        self.error_message = error_message
    def handle_timeout(self, signum, frame):
        raise TimeoutError(self.error_message)
    def __enter__(self):
        signal.signal(signal.SIGALRM, self.handle_timeout)
        signal.alarm(self.seconds)
    def __exit__(self, type, value, traceback):
        signal.alarm(0)

class TimeoutError(Exception):
        pass

class MarathonHive2DB(DBConnectionWrapper):

    CURSOR_WRAPPER = Hive2Cursor

    def __init__(self, wrap_name=None, user='', password='', 
                 database='default', auth_mechanism = "PLAIN",
                 marathon_endpoint="http://m.marathon.getrockerbox.com:8080/v2/tasks"
                 ):
        self.user = str(user)
        self.password = str(password)
        self.database = str(database)
        self.auth_mechanism = auth_mechanism
        self.marathon_endpoint = marathon_endpoint
        self.host = ""
        self.port = 0
        self.refresh_via_endpoint()
        super(MarathonHive2DB, self).__init__(wrap_name=wrap_name)

    def refresh_via_endpoint(self):
        import requests
        response = requests.get(self.marathon_endpoint)
        tasks = response.json()['tasks']
        instances = [task for task in tasks if "spark-sql" in task['id'] ]

        if len(instances):
            import random
            instance = random.choice(instances)
            self.host = instance['host']
            self.port = instance['ports'][0]
        
    def create_connection(self):
        """
        Override the create_connection by first getting the host from the
        marathon endpoint and then connecting
        """

        # self.refresh_via_endpoint()

        import pyhs2
        conn = pyhs2.connect(host=self.host, 
                             port=self.port,
                             authMechanism=self.auth_mechanism, 
                             user=self.user, 
                             password=self.password, 
                             database=self.database)
        return conn

    def session_execute(self, queries, args=()):
        yield self.execute(queries[-1],args)

    def execute(self, query, args = ()):
        from pyhs2.TCLIService.ttypes import TGetSchemasReq
        
        # Try creating a connection
        try:
            self._wrapped = self.create_connection()

        # If it fails, refresh the endpoint and try again.
        except Exception as e:
            logging.error(e)
            logging.info("Refreshing endpoint...")
            self.refresh_via_endpoint()
            self._wrapped = self.create_connection()

        cursor = self._wrapped.cursor()
        res = self.CURSOR_WRAPPER(cursor, query, args=args)()
        print res
        return res.as_dict()
