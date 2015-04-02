from ..helpers import *
from ..base import Routes 

class UserRoutes(Routes):
    @connectors("db")
    def user_login(self):
        import handlers.user as user

        return [
            (r'/', user.LoginHandler, self.connectors),
            (r'/login.*', user.LoginHandler, self.connectors),
            (r'/signup*', user.SignupHandler, self.connectors)
        ]
 
class AdvertiserRoutes(Routes):

    @connectors("db")
    def user_advertiser_routes(self):
        import handlers.reporting as reporting
        import handlers.advertiser as advertiser
        import handlers.campaign as campaign
        import handlers.seller as seller
#        import handlers.api as api
#        import handlers.admin.scripts as scripts

        return [
            (r'/reporting.*',reporting.ReportingHandler, self.connectors),
            (r'/creative/reporting.*', reporting.CreativeReportingHandler, self.connectors),
            (r'/domain/reporting.*', reporting.DomainReportingHandler, self.connectors), 
            (r'/conversion/reporting.*', reporting.ConversionReportingHandler, self.connectors),  

            (r'/intraweek.*',reporting.InsertionOrderHandler, self.connectors),
            (r'/api.*', reporting.APIHandler, self.connectors),
            (r'/advertiser', advertiser.AdvertiserHandler, self.connectors),
            (r'/sellers', seller.SellerHandler, self.connectors), 
            
        ]

    @connectors("reporting_db")
    def user_advertiser_reporting(self):
        import handlers.hoverboard as hoverboard

        return [
             (r'/hoverboard', hoverboard.HoverboardHandler, self.connectors),   
        ]

    @connectors("db","api","cassandra")
    def yoshi_routes(self):
        import handlers.campaign as campaign
        import handlers.creative as creative
        import handlers.viewable as viewable
        import handlers.appnexus as appnexus

        return [
            (r'/campaign', campaign.YoshiCampaignHandler, self.connectors),
            (r'/creative', creative.CreativeHandler, self.connectors),
            (r'/viewability', viewable.ViewabilityHandler, self.connectors),
            (r'/location.*', appnexus.AppnexusHandler, self.connectors)   
        ]
     

    @connectors("reporting_db","api")
    def client_pixel_routes(self):
        import handlers.pixel as pixel
        import handlers.campaign_conversion as campaign_conversion
     
        return [
            (r'/pixel', pixel.PixelReportingHandler, self.connectors),
            (r'/campaign_conversion', campaign_conversion.CampaignConversionReportingHandler, self.connectors) 
        ]

class StreamingRoutes(Routes):

    @connectors("db","buffers")
    def user_streaming_buffers(self):
        import handlers.streaming.streaming as streaming
        return [
            (r'/streaming', streaming.IndexHandler, {}),
            (r'/websocket', streaming.StreamingHandler, self.connectors)
        ]


class ClientRoutes(
    UserRoutes,
    AdvertiserRoutes,
    StreamingRoutes
):
    pass
