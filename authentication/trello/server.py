import tornado.ioloop
from tornado import httpserver
from tornado import web

import httplib2
import json
import logging
import os
import trello

class WebhookHandler(web.RequestHandler):

    def post(self):
        logging.info(self.request.body)
        _j = json.loads(self.request.body)
        _id = _j['action']['data']['card']['id']

        tr = trello.Trello()
        print "cards/%s" % _id
        card = tr.get("cards/%s" % _id)

        self.write(_j)
        self.write(card)
        self.finish()

    def head(self):
        self.finish()

    def get(self):

        self.write("1")
        self.finish()


class WebApp(web.Application):

    def __init__(self):
        handlers = [
            (r"/webhook", WebhookHandler),
        ]

        settings = dict(
            static_path='static',
            cookie_secret='rickotoole',
            debug=True
        )

        super(WebApp, self).__init__(handlers, **settings)

def main():
    
    logging.basicConfig(level=logging.INFO)
    app = WebApp()
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

