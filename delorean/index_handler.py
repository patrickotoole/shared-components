import tornado 

class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        pass

    def get(self):
        self.render("index.html")


