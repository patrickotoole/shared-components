from ...helpers import *
from ...base import Routes
 
class TreeFilterRoutes(Routes):

    @namespace("/admin/filter")
    @connectors("marathon")
    def treefilter(self):
        import handlers.admin as admin

        return [
            (r'/?(.*?)',admin.scripts.filter.FilterHandler, self.connectors)
        ]
 
