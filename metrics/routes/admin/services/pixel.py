from ...helpers import *
from ...base import Routes

class PixelRoutes(Routes):

    @namespace("/admin/pixel")
    @connectors("db", "cassandra", "crushercache")
    def pixel(self):
        import handlers.admin.scripts as scripts

        return [
            (r'/lookup', scripts.PixelLookupHandler, self.connectors),
            (r'/advertiser_data', scripts.AdvertiserDataHandler, self.connectors),
            (r'/advertiser_timeseries', scripts.AdvertiserDataTimeseriesHandler, self.connectors),
            (r'/status', scripts.PixelStatusHandler, self.connectors),
            (r'/alerts', scripts.PixelAlertsHandler, self.connectors),
        ]
