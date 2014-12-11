class Routes(object):
    """
    place to define routes and pass in relevant connectors
    """
    def __init__(self, **kwargs):
        self._conns = kwargs

    @classmethod
    def get_all(cls):
        return [k for c in cls.__mro__ for k in c.__dict__.keys() if c is not Routes and c is not object and not k.startswith("__")]
        #return [i for i in self.__class__.__dict__.keys() if not i.startswith("__")]

        
    @property
    def all(self):
        return self.get_all()

    @property
    def connectors(self):
        return self._conns


    def __call__(self,*requested_routes):
        routes = [ route for name in requested_routes for route in self.__getattribute__(name)() ]
        return routes
 

