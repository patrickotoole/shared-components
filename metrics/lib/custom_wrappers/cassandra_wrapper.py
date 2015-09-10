from link.utils import list_to_dataframe
from link.wrappers import NoSqlConnectionWrapper

class CassandraDB(NoSqlConnectionWrapper):
    """
    A connection wrapper for a sqlite database
    """
    def __init__(self, wrap_name=None, nodes=None, default_fetch_size=None, **kwargs):
        """
        CassandraDB wrapper to connect to a Cassandra cluster
        :param nodes: a list of nodes to use for initial connection
        """
        self.nodes = nodes
        self.params = kwargs
        self.default_fetch_size=default_fetch_size

        # TODO: Where would one configure the default port for link
        super(CassandraDB, self).__init__(wrap_name=wrap_name)

    def create_connection(self):
        """
        Override the create_connection from the DbConnectionWrapper
        class which get's called in it's initializer
        """
        from cassandra.cluster import Cluster
        from cassandra.policies import TokenAwarePolicy, RoundRobinPolicy, DCAwareRoundRobinPolicy
        from cassandra.query import dict_factory

        cluster = Cluster(
            contact_points=self.nodes,
            load_balancing_policy=TokenAwarePolicy(DCAwareRoundRobinPolicy()),
        )
        session = cluster.connect()

        # Don't return paged results
        session.default_fetch_size = self.default_fetch_size

        # Return in dictionary format for easy parsing to DataFrame
        session.row_factory = dict_factory

        return session

    def select_dataframe(self, query):
        """
        Select everything into a datafrome with the column names
        being the names of the colums in the dataframe
        """
        try:
            from pandas import DataFrame
        except:
            raise Exception("pandas required to select dataframe. "
                            "Please install: sudo pip install pandas")

        resp = self.execute(query)
        df = DataFrame(resp)
        return df

    def select_async(self, query):
        future = self.execute_async(query)
        return future

    def __call__(self):
        """
        Run's the command line sqlite application
        """
        self.run_command('cqlsh')

