from ...helpers import *
from ...base import Routes

class AdvertiserReportingRoutes(Routes):

    @namespace("/admin/advertiser")
    @connectors("db","hive", "spark_sql")
    def advertiser_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/client/reporting/?', reporting.AdminClientReportingHandler, self.connectors),
            (r'/reporting/?',reporting.AdvertiserReportingHandler, self.connectors)
        ]
 

    @namespace("/admin/advertiser/viewable")
    @connectors("db","hive", "spark_sql")
    def viewable_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?',reporting.AdvertiserViewableHandler, self.connectors),
            (r'/reporting/+(meta|help)?/?(.*?)',reporting.AdvertiserViewableHandler, self.connectors),
        ]

    @namespace("/admin/advertiser/pixel")
    @connectors("db","hive", "spark_sql")
    def pixel_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.AdvertiserPixelHandler, self.connectors),
            (r'/reporting/+(meta|help)?/?(.*?)', reporting.AdvertiserPixelHandler, self.connectors),
            (r'/geo/reporting/?', reporting.AdvertiserPixelGeoHandler, self.connectors),
            (r'/geo/reporting/+(meta|help)?/?(.*?)', reporting.AdvertiserPixelGeoHandler, self.connectors),
            (r'/device/reporting/?', reporting.AdvertiserPixelDeviceHandler, self.connectors),
            (r'/device/reporting/+(meta|help)?/?(.*?)', reporting.AdvertiserPixelDeviceHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/conversion")
    @connectors("hive", "spark_sql")
    def conversion_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.ConversionCheckHandler, self.connectors), 
            ('/reporting/+(meta|help)?/?(.*?)', reporting.ConversionCheckHandler, self.connectors), 
            ('/imps/reporting/?', reporting.ConversionImpsHandler, self.connectors), 
            ('/imps/reporting/+(meta|help)?/?(.*?)', reporting.ConversionImpsHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/click")
    @connectors("hive", "spark_sql")
    def click_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.ClickCheckHandler, self.connectors), 
            ('/reporting/+(meta|help)?/?(.*?)', reporting.ClickCheckHandler, self.connectors), 
            ('/imps/reporting/?', reporting.ClickImpsHandler, self.connectors), 
            ('/imps/reporting/+(meta|help)?/?(.*?)', reporting.ClickImpsHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/served")
    @connectors("hive", "spark_sql")
    def joined_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/geo/reporting/?', reporting.AdvertiserServedGeoHandler, self.connectors), 
            ('/geo/reporting/+(meta|help)?/?(.*?)', reporting.AdvertiserServedGeoHandler, self.connectors), 
        ]
 
    @namespace("/admin/advertiser/hoverboard")
    @connectors("hive", "spark_sql")
    def hoverboard_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.HoverboardHandler, self.connectors), 
            ('/reporting/+(meta|help)?/?(.*?)', reporting.HoverboardHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/hoverboard_v2")
    @connectors("reporting_db")
    def hoverboard_reporting_v2(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.HoverboardHandlerV2, self.connectors), 
            ('/reporting/+(meta|help)?/?(.*?)', reporting.HoverboardHandlerV2, self.connectors)
        ]    

    @namespace("/admin/advertiser/pixel_url")
    @connectors("reporting_db")
    def pixel_url_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.PixelUrlHandler, self.connectors), 
            ('/reporting/+(meta|help)?/?(.*?)', reporting.PixelUrlHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/visits")
    @connectors("hive", "spark_sql")
    def visits_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.VisitsHandler, self.connectors), 
            ('/reporting/+(meta|help)?/?(.*?)', reporting.VisitsHandler, self.connectors)
        ]
