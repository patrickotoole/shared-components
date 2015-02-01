import tornado.web 
import tornado.httpclient
import ujson

class CircleCIXMLHandler(tornado.web.RequestHandler):
    TOKEN = "circle-token=969e3d7b360a41afe14278d1abfc433ac1c8f4c3"

    @tornado.web.asynchronous
    def get_xml(self,resp):
        self.set_header("Content-Type", "application/xml")
        self.write(resp.body) 
        
        self.finish()

    @tornado.web.asynchronous
    def get_url(self,resp):
        url = ujson.loads(str(resp.body))[0]['url']
        client = tornado.httpclient.AsyncHTTPClient()
        URL = url +"?"
        client.fetch(URL + self.TOKEN, headers={"Accept": "application/xml"}, callback=self.get_xml)
 

    @tornado.web.asynchronous
    def get_build(self,resp):
        json = ujson.loads(str(resp.body))
        build_num = json[0]['build_num']
        client = tornado.httpclient.AsyncHTTPClient()
        URL = "https://circleci.com/api/v1/project/rockerbox/rocamp/%s/artifacts?" % build_num
        client.fetch(URL + self.TOKEN, headers={"Accept": "application/json"}, callback=self.get_url)

    @tornado.web.asynchronous
    def get(self):

        URL = "https://circleci.com/api/v1/project/rockerbox/rocamp/tree/trigger?%s&limit=1" % self.TOKEN
        #URL = "http://localhost:9999/static/nosetest.xml" # for testing
        http_client = tornado.httpclient.AsyncHTTPClient()

        http_client.fetch(URL,headers={"Accept": "application/json"}, callback=self.get_build)
        # for testing
        #http_client.fetch(URL,headers={"Accept": "application/json"}, callback=self.get_xml)
 
