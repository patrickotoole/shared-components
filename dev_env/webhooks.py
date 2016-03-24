import ujson
import tornado.ioloop
from tornado import httpserver
from tornado import web

from link import lnk

class DevServer(web.RequestHandler):
    
    def __init__(self,db):
        self.db = db
        
    def readAppFile(self, branch_name):
        f = open("newapp.json")
        ff = f.read()
        currentFile = ujson.loads(ff)
        appname = "/apps/{}"
        currentFile['id'] = appname.format(branch_name)
        currentFile['cmd'] = currentFile['cmd'].format(branch_name)
        print ujson.dumps(currentFile)

ds = DevServer("")
ds.readAppFile("BRANCH!")
