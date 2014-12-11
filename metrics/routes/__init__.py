from admin import AdminRoutes
from client import ClientRoutes

class AllRoutes(
    AdminRoutes, 
    ClientRoutes
): 

    def __mock_all__(self,routes=[]):
        import yaml
        all_groups = routes or self.get_all()
        nested = self.make_nested_routes(all_groups)
        print yaml.dump(nested,default_flow_style=False)
        
