import signal
import logging
import hive_utils
import pandas as pd
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
                 marathon_endpoint="http://m.marathon.getrockerbox.com:8080/v2/tasks",
                 identifier="spark-sql"
                 ):
        self.user = str(user)
        self.password = str(password)
        self.database = str(database)
        self.auth_mechanism = auth_mechanism
        self.marathon_endpoint = marathon_endpoint
        self.host = ""
        self.port = 0
        self.identifier = identifier
        self.refresh_via_endpoint()
        super(MarathonHive2DB, self).__init__(wrap_name=wrap_name)

    def refresh_via_endpoint(self):
        import requests
        response = requests.get(self.marathon_endpoint, headers={'Accept': 'application/json'})
        tasks = response.json()['tasks']
        instances = [task for task in tasks if self.identifier in task['id'] ]

        if len(instances):
            import random
            instance = random.choice(instances)
            #self.host= "spark-sql-1-2.marathon.mesos"
            self.host = instance['appId'][1:].replace(".","-") + ".marathon.mesos"
            #self.host = "spark-sql-1.2.marathon.mesos" #instance['host']
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
        try:
            self._wrapped = self.create_connection()
            with self._wrapped:
                with self._wrapped.cursor() as cur:
                    for q in queries:
                        cur.execute(q)

                    rows = cur.fetch()
                    columns = [i["columnName"] for i in cur.getSchema()]

                data = [dict(zip(columns, row)) for row in rows]
                        
                return data

        except Exception as e:
            logging.error(e)
            logging.info("Refreshing endpoint...")
            self.refresh_via_endpoint()
            self._wrapped = self.create_connection()

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
            
        with self._wrapped:
            cursor = self._wrapped.cursor()
            res = self.CURSOR_WRAPPER(cursor, query, args=args)()
            logging.info(res)
            d = res.as_dict()
        return d

    def select_dataframe(self, query, args=()):
        results = self.execute(query, args = args)
        return pd.DataFrame(results)

    def tables(self):
        return self.execute("show tables")
