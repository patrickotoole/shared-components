from ..helpers import *
from ..base import Routes

class UserRoutes(Routes):

    @connectors("db","api")
    def user_apie_login(self):
        import handlers.advertiser.handler as advertiser
        import handlers.pixel.handler as pixel

        return [
            (r'/pixel', pixel.PixelHandler, self.connectors),
            (r'/advertiser', advertiser.AdvertiserHandler2, self.connectors),
            (r'/beta', advertiser.AdvertiserHandler2, self.connectors),
        ]


    @connectors("db")
    def user_login(self):
        import handlers.user_handlers as user
        import handlers.integrations.handler as integrations
        import handlers.subscription as subscription
        import handlers.share.handler as share

        import handlers.advertiser.handler as advertiser

        return [
            (r'/', user.LoginHandler, self.connectors),
            (r'/login.*', user.LoginHandler, self.connectors),
            (r'/nonce', user.NonceHandler, self.connectors),
            (r'/share', share.ShareHandler, self.connectors),
            (r'/logout', user.LoginHandler, self.connectors),
            (r'/signup.*', user.SignupHandler, self.connectors),
            (r'/integrations', integrations.IntegrationHandler, self.connectors),
            (r'/account/permissions*', user.AccountPermissionsHandler, self.connectors),
            (r'/subscription', subscription.SubscriptionHandler, self.connectors),
        ]

class AdvertiserRoutes(Routes):

    @connectors("db")
    def user_advertiser_routes(self):
        import handlers.reporting as reporting
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

            (r'/sellers', seller.SellerHandler, self.connectors),

        ]

    @connectors("reporting_db")
    def user_advertiser_reporting(self):
        import handlers.hoverboard as hoverboard

        return [
             (r'/hoverboard', hoverboard.HoverboardHandler, self.connectors),
        ]

    @connectors("db","api","zookeeper","redis")
    def delorean_routes(self):
        import handlers.delorean.delorean as delorean
        import handlers.delorean.campaign as campaign


        return [

            (r'/delorean/campaign', campaign.DeloreanCampaignHandler, self.connectors),
            (r'/delorean', delorean.DeloreanHandler, self.connectors),

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
            (r'/domains', analytics.DomainsMongoHandler, self.connectors),
            (r'/yoshi', analytics.YoshiHandler, self.connectors)
        ]

    @namespace("/crusher/v1")
    @connectors("db","api","cassandra", "mongo", "zookeeper", "crushercache")
    def v1_crusher_routes(self):
        import handlers.analytics as analytics
        import handlers.funnel as funnel
        import handlers.pixel_status as pixel_status
        import handlers.analytics.domains.user as user
        import handlers.analytics.domains.visitor as visitor
        import handlers.t300 as test


        return [
            (r'/user/domains', user.handler.VisitDomainsHandler, self.connectors),
            (r'/user/domains_full', user.full_handler.VisitDomainsFullHandler, self.connectors),
            (r'/user/keyword', user.KeywordUserHandler, self.connectors),

            #(r'/visitor/domains', visitor.handler.VisitorDomainsHandler, self.connectors),
            #(r'/visitor/domains/cache', visitor.cache_handler.ActionDashboardHandler, self.connectors),

            #(r'/visitor/domains_full', visitor.full_handler.VisitorDomainsFullHandler, self.connectors),
            #(r'/visitor/domains_full/cache',visitor.full_cache_handler.VisitorDomainsFullCacheHandler,self.connectors),
            (r'/visitor/300', test.RedirectHandler, self.connectors),
            (r'/visitor/300/(.*?)', test.RedirectHandler, self.connectors),        
            (r'/visitor/(.*?)/cache', visitor.transform_cache_handler.VisitorTransformCacheHandler, self.connectors),
            (r'/visitor/(.*?)', visitor.transform_handler.VisitorTransformHandler, self.connectors),


        ]


    @namespace("/crusher/v2")
    @connectors("db","api","cassandra", "mongo", "zookeeper", "crushercache")
    def v2_crusher_routes(self):
        import handlers.analytics as analytics
        import handlers.funnel as funnel
        import handlers.pixel_status as pixel_status
        import handlers.analytics.domains.user as user
        import handlers.analytics.domains.visitor as visitor
        import handlers.artifacts.handler as artifacts
        import handlers.topics.handler as topics

        return [

            (r'/topics', topics.TopicsHandler, self.connectors),

            (r'/user/domains', user.handler.VisitDomainsHandler, self.connectors),
            (r'/user/domains_full', user.full_handler.VisitDomainsFullHandler, self.connectors),
            (r'/user/keyword', user.KeywordUserHandler, self.connectors),

            #(r'/visitor/domains', visitor.handler.VisitorDomainsHandler, self.connectors),
            #(r'/visitor/domains/cache', visitor.cache_handler.ActionDashboardHandler, self.connectors),

            #(r'/visitor/domains_full', visitor.full_handler.VisitorDomainsFullHandler, self.connectors),
            #(r'/visitor/domains_full/cache',visitor.full_cache_handler.VisitorDomainsFullCacheHandler,self.connectors),
            (r'/artifacts', artifacts.ArtifactsHandler, self.connectors),            

            (r'/visitor/(.*?)/cache', visitor.transform_cache_handler.VisitorTransformCacheHandler, self.connectors),
            (r'/visitor/(.*?)', visitor.transform_handler.VisitorTransformHandler, self.connectors),

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
            (r'/domain/idf.*', analytics.DomainIDFHandler, self.connectors),
            (r'/visit_urls', analytics.VisitUrlsHandler, self.connectors),
            (r'/visit_uids', analytics.VisitUidsHandler, self.connectors),
            (r'/search/(.*?)', analytics.SearchHandler, self.connectors),
            (r'/pattern_search/(.*?)', analytics.PatternSearchHandler, self.connectors),
            (r'/multi_search/(.*?)', analytics.MultiSearchHandler, self.connectors),
            (r'/visit_domains', user.handler.VisitDomainsHandler, self.connectors),
            (r'/visit_events', analytics.VisitEventsHandler, self.connectors),
            (r'/served_events', analytics.ServedEventsHandler, self.connectors),
            (r'/uids_only_cache', analytics.UidsCacheHandler, self.connectors),


            (r'/visit_avails', analytics.VisitAvailsHandler, self.connectors),
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
        #import handlers.pixel as pixel
        import handlers.campaign_conversion as campaign_conversion

        return [
            
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
