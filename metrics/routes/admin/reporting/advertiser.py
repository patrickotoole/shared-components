from ...helpers import *
from ...base import Routes

class AdvertiserReportingRoutes(Routes):

    @namespace("/admin/advertiser")
    @connectors("db","hive", "spark_sql")
    def advertiser_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?',reporting.AdvertiserReportingHandler, self.connectors),
        ]
 

    @namespace("/admin/advertiser/viewable")
    @connectors("db","hive", "spark_sql")
    def viewable_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?',reporting.AdvertiserViewableHandler, self.connectors),
            (r'/reporting/?(.*?)/?',reporting.AdvertiserViewableHandler, self.connectors),
        ]

    @namespace("/admin/advertiser/domain_list")
    @connectors("hive", "spark_sql")
    def domain_list_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?',reporting.DomainListHandler, self.connectors),
            (r'/reporting/?(.*?)/?',reporting.DomainListHandler, self.connectors),
        ]

    @namespace("/admin/advertiser/pixel")
    @connectors("db","hive", "spark_sql")
    def pixel_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            (r'/reporting/?', reporting.AdvertiserPixelHandler, self.connectors),
            (r'/reporting/?(meta)?/?', reporting.AdvertiserPixelHandler, self.connectors),
            (r'/geo/reporting/?', reporting.AdvertiserPixelGeoHandler, self.connectors),
            (r'/geo/reporting/?(meta)?/?', reporting.AdvertiserPixelGeoHandler, self.connectors),
            (r'/device/reporting/?', reporting.AdvertiserPixelDeviceHandler, self.connectors),
            (r'/device/reporting/?(meta)?/?', reporting.AdvertiserPixelDeviceHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/conversion")
    @connectors("hive", "spark_sql")
    def conversion_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.ConversionCheckHandler, self.connectors), 
            ('/reporting/?(meta)?/?', reporting.ConversionCheckHandler, self.connectors), 
            ('/imps/reporting/?', reporting.ConversionImpsHandler, self.connectors), 
            ('/imps/reporting/?(meta)?/?', reporting.ConversionImpsHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/click")
    @connectors("hive", "spark_sql")
    def click_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.ClickCheckHandler, self.connectors), 
            ('/reporting/?(meta)?/?', reporting.ClickCheckHandler, self.connectors), 
            ('/imps/reporting/?', reporting.ClickImpsHandler, self.connectors), 
            ('/imps/reporting/?(meta)?/?', reporting.ClickImpsHandler, self.connectors)
        ]

    @namespace("/admin/advertiser/debug")
    @connectors("hive", "spark_sql")
    def debug_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.DebugReportingHandler, self.connectors), 
            ('/reporting/?(meta)?/?', reporting.DebugReportingHandler, self.connectors), 
        ]

    @namespace("/admin/advertiser/summary")
    @connectors("hive", "spark_sql")
    def joined_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.AdvertiserSummaryHandler, self.connectors), 
            ('/reporting/?(meta)?/?', reporting.AdvertiserSummaryHandler, self.connectors), 
        ]

    @namespace("/admin/advertiser/served")
    @connectors("hive", "spark_sql")
    def joined_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/geo/reporting/?', reporting.AdvertiserServedGeoHandler, self.connectors), 
            ('/geo/reporting/?(meta)?/?', reporting.AdvertiserServedGeoHandler, self.connectors), 
        ]
 
    @namespace("/admin/advertiser/hoverboard")
    @connectors("hive", "spark_sql")
    def hoverboard_reporting(self):
        import handlers.admin.reporting as reporting

        return [
            ('/reporting/?', reporting.HoverboardHandler, self.connectors), 
            ('/reporting/?(meta)?/?', reporting.HoverboardHandler, self.connectors)
        ]
