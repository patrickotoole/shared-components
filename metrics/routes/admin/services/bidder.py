from ...helpers import *
from ...base import Routes
 
class BidderRoutes(Routes):

    @namespace("/admin/bidder")
    @connectors("bidder","do","marathon")
    def bidder(self):
        import handlers.admin as admin

        return [
            (r'/?(.*?)',admin.scripts.bidder.BidderHandler, self.connectors)

        ]
        
    @namespace("/admin/debug")
    @connectors("api")
    def debug(self):
        import lib.asi_runner.debug_handler as debug_handler
        return [
            (r'/?(.*?)',debug_handler.DebugAuctionHandler, self.connectors)

        ]
