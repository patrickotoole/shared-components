import tornado.web
import logging

class LineItemDashboardHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.db = kwargs.get("reporting",False) 

    def get(self):        
        self.render("line_item.html") 
