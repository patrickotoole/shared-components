import mock
from tornado.testing import AsyncHTTPTestCase
from tornado.web import  Application, RequestHandler
from tornado.escape import to_unicode, json_decode, json_encode

ADVERTISER_ID = 123


import handler 
from link import lnk

class ShareHandlerTest(AsyncHTTPTestCase):

    def check_queries(self,query):

        self.assertTrue("action_dashboard_share" in query)
        self.assertTrue(len(query.split(",")) == 5)
        self.NONCE = query.split(",")[4][1:-3]

        return "yo"


    def get_app(self):
        self.NONCE = ""
        db = mock.MagicMock()
        db.execute = self.check_queries

        self.app = Application([('/', handler.ShareHandler, dict(db=db))],
            cookie_secret="rickotoole",
        ) 

        return self.app

    def test_get_share_failure(self):
        response = self.fetch('/?nonce=iamafailednonce',method="GET")
        self.assertTrue(403 == response.code)

    def test_get_share_success(self):
        response = self.fetch('/?nonce=iamanonce',method="GET")
        with mock.patch.object(handler.ShareHandler, "lookup_nonce") as m:
            m.return_value = ADVERTISER_ID
            response = self.fetch('/', method='GET')

        self.assertTrue(str(ADVERTISER_ID) in response.body)

    def check_share(self,advertiser_id, obj):

        self.assertEqual(ADVERTISER_ID,advertiser_id)
        self.assertTrue(type(obj) == dict)

        return "GOOD"
        

    def test_create_share(self):
        with mock.patch.object(handler.ShareHandler, "get_advertiser_if_nonce") as m:
            m.return_value = True
            with mock.patch.object(handler.ShareHandler, "make_share") as m:
                m.side_effect = self.check_share
                with mock.patch.object(handler.ShareHandler, "get_secure_cookie") as a:
                    a.side_effect = lambda x: True if x == "user" else ADVERTISER_ID
                    response = self.fetch('/',method="POST",body="{}")
        self.assertEqual("GOOD", response.body)

    def test_create_share_statements(self):

        with mock.patch.object(handler.ShareHandler, "get_advertiser_if_nonce") as m:
            m.return_value = True
            with mock.patch.object(handler.ShareHandler, "get_secure_cookie") as a:
                a.side_effect = lambda x: True if x == "user" else ADVERTISER_ID

                response = self.fetch('/',method="POST",body='{"urls":["a","b"]}')
        self.assertEqual(str(self.NONCE), response.body)



    def test_create_share_fail(self):
        with mock.patch.object(handler.ShareHandler, "get_advertiser_if_nonce") as m:
            m.return_value = False
            with mock.patch.object(handler.ShareHandler, "get_secure_cookie") as a:
                a.side_effect = lambda x: True if x == "user" else "0"
                response = self.fetch('/?nonce=iamafailednonce',method="POST",body="")
        self.assertEqual(403, response.code)

