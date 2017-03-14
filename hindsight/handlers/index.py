import tornado.web
import logging
import json

class IndexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("db",False) 
        self.rb = kwargs.get("rb",False) 

        pass

    def get(self):
        self.render("index.html",forms={})

