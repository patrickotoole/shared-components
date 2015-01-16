from ...helpers import *
from ...base import Routes
 
class ViewableRoutes(Routes):
    @namespace("/admin/viewable")
    @connectors("api","db","hive", "spark_sql")
    def viewability(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.ViewabilityHandler, self.connectors),    
        ]

    @namespace("/admin/viewable")
    @connectors("db","api")
    def viewable_scripts(self):
        import handlers.admin.scripts as scripts

        return [
            (r'/?(.*?)/?(meta)/?',scripts.ViewabilityHandler, self.connectors),
            (r'/?(.*?)/?',scripts.ViewabilityHandler, self.connectors)
        ]
  
