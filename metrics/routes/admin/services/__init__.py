from ...helpers import *
from ...base import Routes 

from batch_request import BatchRequestRoutes
from campaign_check import CampaignCheckRoutes
from advertiser import AdvertiserRoutes
from segment import SegmentRoutes
from logging import LoggingRoutes
from bidder import BidderRoutes
from treefilter import TreeFilterRoutes

class ServiceRoutes(
    TreeFilterRoutes,
    BidderRoutes,
    BatchRequestRoutes,
    CampaignCheckRoutes,
    AdvertiserRoutes,
    SegmentRoutes,
    LoggingRoutes
):

    @namespace("/admin/pixel")
    @connectors("db")
    def pixel_service_routes(self):
        import handlers.admin.scripts as scripts
        return [                                                     
            (r'/?',scripts.PixelHandler, self.connectors)
        ]

    @namespace("/admin/appnexus")
    @connectors("api","db")
    def appnexus_scripts(self):
        import handlers.admin.scripts.appnexus as appnexus
        
        return [
            (r'/campaign/?', appnexus.CampaignHandler, self.connectors), 
        ]

    @namespace("/admin")
    @connectors("reporting_db")
    def trello_scripts(self):
        import lib.trello.trello as trello
        
        return [
            (r'/trello/?', trello.TrelloHandler, self.connectors), 
        ]
 
 
