from ...helpers import *
from ...base import Routes

class LoggingRoutes(Routes):

    @namespace("/admin")
    @connectors("reporting_db","api","db")
    def logging(self):
        from handlers.adminreport import AdminReportHandler
        from lib.report.handlers import ReportingLogHandler
        import handlers.admin.scripts as scripts 

        return [
            (r'/report/(.*?)/.*', AdminReportHandler, {}),
            (r'/reportinglog/(.*?)', ReportingLogHandler, {}),
            (r'/event_log', scripts.EventLogHandler, self.connectors),
            (r'/event_log/(.*?)', scripts.EventLogHandler, self.connectors),
            (r'/opt_log', scripts.OptLogHandler, self.connectors),
            (r'/opt_log/(.*?)', scripts.OptLogHandler, self.connectors),
            (r'/opt_rules', scripts.OptRulesHandler, self.connectors),
            (r'/opt_rules/(.*?)', scripts.OptRulesHandler, self.connectors)
        ]
