import tornado
import os
import pycurl
from goose import Goose
import readability
import ujson
import logging
import requests
from readability import Document

class ScrapperGooseHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.data = {}
        self.goose = Goose()

    def get(self, uri):
        url = self.get_argument("url",False)
        title = "No title"
        descript = "No description"
        article_text="NO article"
        if url:
            try:
                article = self.goose.extract(url=url)
                title = article.title
                descript = article.meta_description
                article_text = article.cleaned_text[:1000]
            except Exception as e:
                logging.info(str(e))
        response = {'url':url,'result':{'title':title,'description':descript, "article":article_text}}
        self.write(ujson.dumps(response))

class ScrapperReadabilityHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.data = {}

    def get(self, uri):
        url = self.get_argument("url",False)
        _resp = requests.get(url)
        doc = Document(_resp.text)
        current_title = doc.title()
        res = {'url':url,'result':{'title':current_title,'description':"", "article":""}}
        self.write(ujson.dumps(res))
