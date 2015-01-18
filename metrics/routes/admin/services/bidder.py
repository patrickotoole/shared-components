from ...helpers import *
from ...base import Routes
 
class BidderRoutes(Routes):

    @namespace("/admin/bidder")
    @connectors("bidder","do")
    def bidder(self):
        import handlers.admin as admin

        return [
            (r'/?',admin.scripts.bidder.BidderHandler, self.connectors)
        ]
 
