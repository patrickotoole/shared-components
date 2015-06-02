from link.wrappers import NoSqlConnectionWrapper

class MongoDB2(NoSqlConnectionWrapper):
    """
    A connection wrapper for a sqlite database
    """
    def __init__(self, wrap_name=None, host=None, port=None, **kwargs):
        """
        MongoDB wrapper to connect to mongo
        :param host: the host:port of the hbase thrift server
        """
        (self.host, self.port) = (host, port) 
        self.params = kwargs
        
        # TODO: Where would one configure the default port for link
        super(MongoDB2, self).__init__(wrap_name=wrap_name)

    def create_connection(self):
        """
        Override the create_connection from the DbConnectionWrapper
        class which get's called in it's initializer
        """
        from pymongo import MongoClient
        return MongoClient(self.host, port=self.port, **self.params)

    def __call__(self):
        """
        Run's the command line sqlite application
        """
        self.run_command('mongo')
