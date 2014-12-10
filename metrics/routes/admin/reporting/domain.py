from ...helpers import *
from ...base import Routes
 
class DomainRoutes(Routes):  
    @namespace("/admin/domain")
    @connectors("hive") 
    def domain_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.DomainHandler, self.connectors),
            (r'/reporting/?(.*?)/?', reporting.DomainHandler, self.connectors),
            (r'/categories/reporting/?', reporting.DomainCategoriesHandler, self.connectors),
            (r'/categories/reporting/?(meta)?/?', reporting.DomainCategoriesHandler, self.connectors)
        ]
 
