from ...helpers import *
from ...base import Routes

class SegmentRoutes(Routes):

    @namespace("/admin/segment")
    @connectors("bidder","db")
    def scrubbed(self):
        import handlers.admin.scripts as scripts
        import handlers.hindsight_streaming as hs_streaming

        return [

            (r'/hindsight/?',hs_streaming.HindsightHandler, self.connectors),
            (r'/scrubbed/?',scripts.ProfileHandler, self.connectors),
            (r'/scrubbed/(.*?)',scripts.ProfileHandler, self.connectors)
        ]
 
