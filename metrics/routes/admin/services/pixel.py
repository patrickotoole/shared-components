from ...helpers import *
from ...base import Routes

class PixelRoutes(Routes):

    @namespace("/admin/pixel")
    @connectors("db", "cassandra")
    def pixel(self):
        import handlers.admin.scripts as scripts

        return [
            (r'/lookup', scripts.PixelLookupHandler, self.connectors),
            (r'/status', scripts.PixelStatusHandler, self.connectors),
            (r'/alerts', scripts.PixelAlertsHandler, self.connectors),
        ]
