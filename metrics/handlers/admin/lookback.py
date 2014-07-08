import tornado.web
from twisted.internet import defer, threads

#import lib.lookback as lookback

   
class DebugHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        self.render("../templates/admin/debug.html")

class UIDHandler(tornado.web.RequestHandler):
    @tornado.web.asynchronous
    def get(self):
        http_client = AsyncHTTPClient()
        http_client.fetch(
            "http://ib.adnxs.com/cookie?dongle=pledgeclass&uid=9052761083883901898&member_id=2024",
            callback=self.on_fetch
        )

    def on_fetch(self, response):
        print response
        self.write("")
        self.finish()

def get_content(uid):
    content = os.popen("ssh root@107.170.16.15 'tail -n 2000000 /var/log/nginx/qs.log | grep %s'" % uid).read()
    content += os.popen("ssh root@107.170.2.67 'tail -n 2000000 /var/log/nginx/qs.log | grep %s'" % uid).read() 
    #content += os.popen("ssh root@107.170.31.214 'grep %s /root/qs.log'" % uid).read() 
    return content

def async_get_content(uid):
    d = threads.deferToThread(get_content,uid)
    return d
  


class LookbackHandler(tornado.web.RequestHandler):

    @defer.inlineCallbacks
    def get_content(self,uid):
        content = yield async_get_content(uid)
        lb = lookback.Lookback(uid,content)
        data = lb.get_all()
        self.write(data)
        self.finish()
        
    @tornado.web.asynchronous
    def get(self):
        is_json = 'json' in self.request.uri
        uid = self.get_argument("uid",False)
        if is_json and uid:
            self.get_content(uid)
        else:
            self.render("lookback.html")


