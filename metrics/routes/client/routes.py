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

        return [
            (r'/reporting.*',reporting.ReportingHandler, self.connectors),
            (r'/creative/reporting.*', reporting.CreativeReportingHandler, self.connectors),
            (r'/domain/reporting.*', reporting.DomainReportingHandler, self.connectors), 
            (r'/conversion/reporting.*', reporting.ConversionReportingHandler, self.connectors),  

            (r'/intraweek.*',reporting.InsertionOrderHandler, self.connectors),
            (r'/advertiser',advertiser.AdvertiserHandler, self.connectors)
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
