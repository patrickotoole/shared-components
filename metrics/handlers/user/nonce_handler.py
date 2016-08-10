import tornado.web
import ujson
import logging

from database import UserDatabase
import send as email
import send_invite as invite

class NonceHandler(tornado.web.RequestHandler,UserDatabase):

    def initialize(self,db=None):
        self.db = db

    def get(self):
        nonce = self.get_argument("nonce",False) 

        try: _dicts = self.get_by_nonce(nonce)
        except: _dicts = []

        self.write(str(len(_dicts)))
        self.finish()
        return

    
