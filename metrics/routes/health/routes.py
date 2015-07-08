from ..helpers import *
from ..base import Routes 

class HealthRoutes(Routes):
    @connectors("db","cassandra","spark_sql")
    def health(self):
        import handlers.health as health

        return [
            (r'/health/?(.*?)', health.HealthHandler, self.connectors)
        ]
 
