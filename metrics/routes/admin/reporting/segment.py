from ...helpers import *
from ...base import Routes
 
class SegmentRoutes(Routes):
    @namespace("/admin/segment")
    @connectors("hive", "spark_sql")
    def segment_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.SegmentReportingHandler, self.connectors),    
        ]
 
