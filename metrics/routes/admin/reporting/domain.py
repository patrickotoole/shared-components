from ...helpers import *
from ...base import Routes
 
class DomainRoutes(Routes):  
    @namespace("/admin/domain")
    @connectors("hive", "spark_sql", "db") 
    def domain_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.DomainHandler, self.connectors),
            (r'/reporting/?(.*?)/?', reporting.DomainHandler, self.connectors),
            (r'/categories/reporting/?', reporting.DomainCategoriesHandler, self.connectors),
            (r'/categories/reporting/?(meta|help)?/?(.*?)', reporting.DomainCategoriesHandler, self.connectors)
        ]
 
