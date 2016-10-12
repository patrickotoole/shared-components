import mock
from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode
import ujson
import handler 
from link import lnk
import pandas

class TopicsHandlerTest(AsyncHTTPTestCase):

    def check_queries(self,query):

        self.assertTrue("topic" in query)
        
        return pandas.DataFrame([{"topic":"ATOPIC"}])


    def get_app(self):
        db = mock.MagicMock()
        crusher = mock.MagicMock()
        crusher.select_dataframe.side_effect = lambda x : self.check_queries(x)
        self.app = Application([('/', handler.TopicsHandler, dict(db=db, crushercache=crusher))],
            cookie_secret='rickotoole',
            login_url="/login"
        ) 

        return self.app

    def test_get_success(self):
        with mock.patch.object(handler.TopicsHandler, 'get_secure_cookie') as m:
            m.return_value = 'something'
            response = self.fetch('/?topic=trump', method='GET')
        print response
        self.assertTrue(200 == response.code)


    def test_post_failure(self):
        with mock.patch.object(handler.TopicsHandler, 'get_secure_cookie') as m:
            m.return_value = 'something'
            response = self.fetch('/?topic=', method='GET')
        self.assertTrue(400 == response.code)
