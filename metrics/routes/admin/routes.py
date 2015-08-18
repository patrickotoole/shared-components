from ..helpers import *
from ..base import Routes
from reporting import ReportingRoutes
from services import ServiceRoutes
from streaming import StreamingRoutes
from census import CensusRoutes 


class AdminRoutes(
    StreamingRoutes,
    ReportingRoutes,
    ServiceRoutes,
    CensusRoutes
):

    @namespace("/admin")
    @connectors("db")
    def index(self):
        import handlers.admin.index as index 

        return [
            (r'/?', index.IndexHandler, self.connectors),
            (r'/index', index.IndexHandler, self.connectors),
        ]

    @namespace("/admin")
    @connectors("api","db")
    def misc_services(self):
        
        import handlers.admin.scripts as scripts
        import handlers.admin.optimization as optimization

        return [
            
            (r'/optimization/domain/?', optimization.DomainListHandler, self.connectors),
            (r'/intraweek.*', scripts.IntraWeekHandler, self.connectors),
            (r'/api/v2.*', scripts.APIHandlerV2, self.connectors),
            (r'/api.*', scripts.APIHandler, self.connectors)
        ]
         
  
#class OldRoutes(Routes):
    """
        old_handlers = [
            (r'/debug', admin.lookback.DebugHandler),
            (r'/uid.*', admin.lookback.UIDHandler),
            (r'/lookback.*', admin.lookback.LookbackHandler),
            (r'/admin/money.*',admin.scripts.MoneyHandler, dict(db=db,api=api)),
            (r'/admin/imps/?', admin.scripts.ImpsHandler, dict(db=db, api=api, hive=hive)),
        ]
    """
