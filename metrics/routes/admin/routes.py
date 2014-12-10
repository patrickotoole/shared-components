from ..helpers import *
from ..base import Routes
from reporting import ReportingRoutes
from services import ServiceRoutes
from streaming import StreamingRoutes


class AdminRoutes(
    ReportingRoutes,
    ServiceRoutes,
    StreamingRoutes
):

    @namespace("/admin")
    @connectors("")
    def index(self):
        import handlers.admin.index as index 

        return [
            (r'/?', index.IndexHandler, {}),
            (r'/index', index.IndexHandler, {}),
        ]

    @namespace("/admin")
    @connectors("api","db")
    def misc_services(self):
        
        import handlers.admin.scripts as scripts
        import handlers.admin.optimization as optimization

        return [
            
            (r'/optimization/domain/?', optimization.DomainListHandler, self.connectors),
            (r'/intraweek.*', scripts.IntraWeekHandler, self.connectors),
            (r'/api.*', scripts.APIHandler, self.connectors),
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
