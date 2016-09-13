import mock
from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
import ujson
import handler 
from link import lnk
import pandas

class ShareHandlerTest(AsyncHTTPTestCase):

    def check_queries(self,query):

        self.assertTrue("artifacts" in query)
        self.assertTrue("key_name" in query)
        
        return pandas.Dataframe()


    def get_app(self):

        db = mock.MagicMock()
        db.execute.check_queries
        crusher = mock.MagicMock()
        self.app = Application([('/', handler.ArtifactsHandler, dict(db=db, crushercache=crusher))],
            cookie_secret='rickotoole',
            login_url="/login"
        ) 

        return self.app

    def test_get_success(self):
        with mock.patch.object(handler.ArtifactsHandler, 'get_secure_cookie') as m:
            m.return_value = 'something'
            response = self.fetch('/?artifact=exlcude_domains', method='GET')
        self.assertTrue(200 == response.code)
        self.assertTrue('artifact' in ujson.loads(response.body).keys())


    def test_post_success(self):
        with mock.patch.object(handler.ArtifactsHandler, 'get_secure_cookie') as m:
            m.return_value = 'something'
            response = self.fetch('/', method='POST', body=ujson.dumps({"artifact":{"key_name":"test","json":{}}}))
        self.assertTrue(200 == response.code)
        self.assertTrue('success' in ujson.loads(response.body).keys())

    def test_post_failure(self):
        with mock.patch.object(handler.ArtifactsHandler, 'get_secure_cookie') as m:
            m.return_value = 'something'
            response = self.fetch('/', method='POST', body=ujson.dumps({"artifact":{}}))
        self.assertTrue(400 >= response.code)
