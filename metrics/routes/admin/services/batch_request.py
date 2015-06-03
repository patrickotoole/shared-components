from ...helpers import *
from ...base import Routes

class BatchRequestRoutes(Routes):

    @namespace("/admin/batch_request")
    @connectors("db","api", "reporting_db")
    def batch_request(self):
        import handlers.admin.scripts as scripts

        return [
            (r'/new.*', scripts.BatchRequestFormHandler, self.connectors),
            (r's.*', scripts.BatchRequestsHandler, self.connectors),
            (r'/submit', scripts.BatchSubmitHandler, self.connectors),
            (r'/submit/(.*?)', scripts.BatchSubmitHandler, self.connectors),
            (r'/log', scripts.BatchLogHandler, self.connectors),
            (r'/log/(.*?)', scripts.BatchLogHandler, self.connectors)
        ]

