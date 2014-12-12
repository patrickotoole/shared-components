from ...helpers import *
from ...base import Routes 

from batch_request import BatchRequestRoutes
from campaign_check import CampaignCheckRoutes
from advertiser import AdvertiserRoutes
from segment import SegmentRoutes
from logging import LoggingRoutes

class ServiceRoutes(
    BatchRequestRoutes,
    CampaignCheckRoutes,
    AdvertiserRoutes,
    SegmentRoutes
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
 