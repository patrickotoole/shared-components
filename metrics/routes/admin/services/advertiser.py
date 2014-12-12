from ...helpers import *
from ...base import Routes
 
class AdvertiserRoutes(Routes):
    @namespace("/admin/advertiser")
    @connectors("db","api")
    def advertiser(self):
        import handlers.admin as admin

        return [
            (r'/domain_list/?(.*?)/?',admin.target_list.TargetListHandler, self.connectors),  
            (r'/segment/?(.*?)/?',admin.segment.SegmentHandler, self.connectors), 
            (r'/viewable/?(.*?)/?',admin.advertiser.AdvertiserViewableHandler, self.connectors),
            (r'/?(.*?)',admin.scripts.AdvertiserHandler, self.connectors)   
        ]
 
