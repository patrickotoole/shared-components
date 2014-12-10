from ...helpers import *
from ...base import Routes

class SegmentRoutes(Routes):

    @namespace("/admin/segment")
    @connectors("bidder")
    def bidder(self):
        import handlers.admin.scripts as scripts

        return [
            (r'/scrubbed/?',scripts.ProfileHandler, self.connectors),
            (r'/scrubbed/(.*?)',scripts.ProfileHandler, self.connectors)
        ]
 
