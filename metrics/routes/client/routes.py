from ..helpers import *
from ..base import Routes

class UserRoutes(Routes):
    @connectors("db")
    def user_login(self):
        import handlers.user as user

        return [
            (r'/', user.LoginHandler, self.connectors),
            (r'/beta', user.LoginAdvertiserHandler, self.connectors),
            (r'/login.*', user.LoginHandler, self.connectors),
            (r'/signup*', user.SignupHandler, self.connectors),
            (r'/account/permissions*', user.AccountPermissionsHandler, self.connectors)
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

    @connectors("db","api","cassandra", "mongo")
    def yoshi_routes(self):
        import handlers.campaign as campaign
        import handlers.profile as profile
        import handlers.creative as creative
        import handlers.appnexus as appnexus
        import handlers.analytics as analytics


        return [
            (r'/campaign', campaign.YoshiCampaignHandler, self.connectors),
            (r'/profile', profile.YoshiProfileHandler, self.connectors),
            (r'/creative', creative.CreativeHandler, self.connectors),
            (r'/location.*', appnexus.AppnexusHandler, self.connectors),
            (r'/viewability', analytics.ViewabilityHandler, self.connectors),
            (r'/availability', analytics.AvailabilityHandler, self.connectors),
            (r'/domains', analytics.DomainsMongoHandler, self.connectors)

        ]

    @namespace("/crusher/v1")
    @connectors("db","api","cassandra", "mongo", "zookeeper")
    def v1_crusher_routes(self):
        import handlers.analytics as analytics
        import handlers.funnel as funnel
        import handlers.pixel_status as pixel_status
        import handlers.analytics.domains.user as user
        import handlers.analytics.domains.visitor as visitor


        return [
            (r'/user/domains', user.handler.VisitDomainsHandler, self.connectors),
            (r'/user/domains_full', visitor.full_handler.VisitDomainsFullHandler, self.connectors),
         
            (r'/visitor/domains', visitor.handler.SearchVisitorDomainsHandler, self.connectors),
            (r'/visitor/domains/cache', visitor.cache_handler.ActionDashboardHandler, self.connectors),

            (r'/visitor/domains_full', visitor.full_handler.VisitorDomainsHandler, self.connectors),
            (r'/visitor/domains_full/cache',visitor.full_cache_handler.VisitorDomainsFullCacheHandler,self.connectors),
            (r'/visitor/keywords', visitor.handler.SearchVisitorDomainsHandler, self.connectors),


        ]



    @namespace("/crusher")
    @connectors("db","api","cassandra", "mongo", "zookeeper")
    def crusher_routes(self):
        import handlers.analytics as analytics
        import handlers.funnel as funnel
        import handlers.pixel_status as pixel_status
        import handlers.analytics.domains.user as user
        import handlers.analytics.domains.visitor as visitor


        return [
            (r'/zk_endpoint', funnel.ZKHandler, self.connectors),
            (r'/dashboard_cached', analytics.ActionDashboardHandler, self.connectors),
            (r'/domain/idf.*', analytics.DomainIDFHandler, self.connectors),
            (r'/visit_urls', analytics.VisitUrlsHandler, self.connectors),
            (r'/visit_uids', analytics.VisitUidsHandler, self.connectors),
            (r'/search/(.*?)', analytics.SearchHandler, self.connectors),
            (r'/pattern_search/(.*?)', analytics.PatternSearchHandler, self.connectors),
            (r'/multi_search/(.*?)', analytics.MultiSearchHandler, self.connectors),
            (r'/visit_domains', user.handler.VisitDomainsHandler, self.connectors),
            (r'/visit_events', analytics.VisitEventsHandler, self.connectors),
            (r'/served_events', analytics.ServedEventsHandler, self.connectors),
            (r'/visit_domains_full', visitor.full_handler.VisitDomainsFullHandler, self.connectors),
            (r'/domains_visitor_full', visitor.full_handler.VisitorDomainsHandler, self.connectors),
            (r'/cached_visitor_domains', visitor.full_cache_handler.VisitorDomainsFullCacheHandler, self.connectors),
            (r'/search_visitor_domains', visitor.handler.SearchVisitorDomainsHandler, self.connectors),
            (r'/uids_only_cache', analytics.UidsCacheHandler, self.connectors),


            (r'/visit_avails', analytics.VisitAvailsHandler, self.connectors),
            (r'/stats/?', analytics.OnSiteStatsHandler, self.connectors),
            (r'/stats/+(meta|help)?/?(.*?)', analytics.OnSiteStatsHandler, self.connectors),
            (r'/funnel/action/recommended', funnel.RecommendedActionHandler, self.connectors),
            (r'/funnel/campaign', funnel.FunnelCampaignHandler, self.connectors),
            (r'/funnel/lookalike_campaign', funnel.LookalikeCampaignHandler, self.connectors),
            (r'/funnel/action', funnel.ActionHandler, self.connectors),
            (r'/funnel/action/(.*?)', funnel.ActionHandler, self.connectors),
            (r'/funnel/lookalike', funnel.FunnelLookalikeHandler, self.connectors),
            (r'/funnel/lookalike/(.*?)', funnel.FunnelLookalikeHandler, self.connectors),
            (r'/funnel/search/(.*?)', funnel.FunnelSearchHandler, self.connectors),
            (r'/pattern/?', funnel.PatternStatusHandler, self.connectors),
            (r'/pattern/(.*?)', funnel.PatternStatusHandler, self.connectors),

            (r'/pixel/cookie', pixel_status.CookieHandler, self.connectors),
            (r'/pixel/status', pixel_status.PixelHandler, self.connectors),
            (r'/pixel/status/lookup', pixel_status.LookupHandler, self.connectors),


            (r'/funnel', funnel.FunnelHandler, self.connectors),
            (r'/?', funnel.FunnelHandler, self.connectors),
            (r'/.*?', funnel.FunnelHandler, self.connectors),
            (r'/funnel/(.*?)', funnel.FunnelHandler, self.connectors),

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
