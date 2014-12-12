def namespace(name):

    def make_namespace(fn):

        def add_namespace(self):
            routes = [(name + i,j,k) for i,j,k in fn(self)]
            return routes

        return add_namespace

    return make_namespace

def connectors(*conns):

    def make_connectors(fn):

        def filter_conns(connectors):
            return {c:conn for c,conn in connectors.iteritems() if c in conns}

        def filter_connectors(self):
            return [(i,j,filter_conns(k)) for i,j,k in fn(self)]

        return filter_connectors

    return make_connectors
 
