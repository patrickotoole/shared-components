from admin import AdminRoutes
from client import ClientRoutes
from health import HealthRoutes

class AllRoutes(
    AdminRoutes, 
    ClientRoutes,
    HealthRoutes
): 

    def __mock_all__(self,routes=[]):
        import yaml
        all_groups = routes or self.get_all()
        nested = self.make_nested_routes(all_groups)
        print yaml.dump(nested,default_flow_style=False)
        
