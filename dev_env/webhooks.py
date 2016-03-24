import ujson
import tornado.ioloop
from tornado import httpserver
from tornado import web
import logging
from link import lnk

class DevServer(web.RequestHandler):
    
    def initialize(self,db):
        self.db = db
        
    def post(self):
        try:
            g_data = ujson.loads(self.request.body)
            logging.info(self.request.body)
            marathon_file = self.readAppFile(g_data['pull_request']['head']['ref'])
            success = self.sendToMarathon(marathon_file, g_data['pull_request']['head']['ref'])
            if success:
                self.write(ujson.dumps({"success":True}))
            else:
                self.write(ujson.dumps({"success":False}))
        except:
            self.write(ujson.dumps({"success":False}))

    def readAppFile(self, branch_name):
        f = open("newapp.json")
        ff = f.read()
        currentFile = ujson.loads(ff)
        currentFile['id'] = currentFile['id'] % {'branch_name': branch_name.replace("_","-")}
        currentFile['cmd'] = currentFile['cmd'] % {'branch_name': branch_name}
        logging.info(ujson.dumps(currentFile))
        return ujson.dumps(currentFile)
    
    def sendToMarathon(self, jsonFile, branch_name):
        marathon = lnk.api.marathon
        logging.info("about to make request")
        _resp = marathon.post('/v2/apps' ,data=jsonFile)
        logging.info(_resp)
        logging.info(_resp.text)
        return True

class WebApp(web.Application):

    def __init__(self,db):
        handlers = [
            (r"/webhook", DevServer, {"db":db}),
        ]

        settings = dict(
            static_path='static',
            cookie_secret='rickotoole',
            debug=True
        )

        super(WebApp, self).__init__(handlers, **settings)

def main():

    logging.basicConfig(level=logging.INFO)

    from link import lnk

    app = WebApp(lnk.dbs.rockerbox)
    server = httpserver.HTTPServer(app)
    server.listen(9001, '0.0.0.0')
    logging.info("Serving at http://0.0.0.0:9001")
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info("Interrupted...")
    finally:
        pass


if __name__ == '__main__':
    main()


