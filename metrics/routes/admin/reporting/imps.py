from ...helpers import *
from ...base import Routes
 
class ImpsRoutes(Routes):
    @namespace("/admin/imps")
    @connectors("hive")
    def imps_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.ImpsReportingHandler, self.connectors),    
        ]
 