import mock
from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode

import handler 
from link import lnk

class ShareHandlerTest(AsyncHTTPTestCase):

    def check_queries(self,query):

        self.assertTrue("action_dashboard_share" in query)
        self.assertTrue(len(query.split(",")) == 5)

        return "yo"


    def get_app(self):
        self.NONCE = ""
        db = mock.MagicMock()
        crusher = mock.MagicMock()
        db.execute = self.check_queries

        self.app = Application([('/', handler.ArtifactsHandler, dict(db=db, crushercache=crusher))],
            cookie_secret="rickotoole",
            login_url="/bad"
        ) 

        return self.app

    def test_get_share_success(self):
        response = self.fetch('/?artifact=exlcude_domains',method="GET")
        print response
        self.assertTrue(200 == response.code)

    def test_get_share_failure(self):
        response = self.fetch('/?artifact=fakeartifactimadeup',method="GET")


