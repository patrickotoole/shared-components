import tornado
import os
import pycurl
from goose import Goose
import ujson
class ScrapperGooseHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.data = {}
        self.goose = Goose()

    def get(self, uri):
        url = self.get_argument("url",False)
        title = "No title"
        if url:
            article = self.goose.extract(url=url)
            title = article.title
            descript = article.meta_description
            article_text = article.cleaned_text[:1000]
        response = {'url':url,'result':{'title':title,'description':descript, "article":article_text}}
        self.write(ujson.dumps(response))

class ScrapperRegexHandler(tornado.web.RequestHandler):

    def initialize(self,**kwargs):
        self.data = {}

    def get(self, uri):
        url = self.get_argument("url",False)
        if url:
            from io import BytesIO

            buffer = BytesIO()
            c = pycurl.Curl()
            c.setopt(c.URL, url)
            c.setopt(c.WRITEDATA, buffer)
            c.perform()
            c.close()

            body = buffer.getvalue()
            import ipdb; ipdb.set_trace()
            # Body is a byte string.
            # We have to know the encoding in order to print it to a text file
            # such as standard output.
            res = body.decode('iso-8859-1')
        self.write(res)
