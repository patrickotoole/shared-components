import tornado.ioloop
from tornado import httpserver
from tornado import web

import httplib2
import json
import logging
import os
import trello

def modify(j,board,ts):

    split = j['name'].split("(")
    if (len(split) > 1):
        opp = split[1].replace(")","")
        ab = split[0].split("-")
    else:
        opp = ""

        ab = split[0].split("-")
        
    if (len(ab) > 1):
        agency = ab[0]
        brand = ab[1]
    else:
        agency = ""
        brand = ab[0]
        
    split_opp = opp.split("-")
    if len(split_opp) > 1:
        opportunity = "-".join(split_opp[:-1])
        timing = split_opp[-1]
    else:
        opportunity = ""
        timing = ""

    from datetime import datetime  
    
    return {
        "agency": agency.strip(),
        "brand" : brand.strip(),
        "opportunity" : opportunity.strip(),
        "timing" : timing.strip(),
        "board" : board,
        "trello_id": j['id'],
        "last_modified": ts,
        "created_at": datetime.fromtimestamp(int(j['id'][0:8],16))
    }

def process(action):
    import pandas
    c = action['data']['card']
    list_name = action['data']['list']['name']
    ts = action['date']
    advertisers = [ modify(c,list_name,ts) ]
    return pandas.DataFrame(advertisers)

class WebhookHandler(web.RequestHandler):

    def initialize(self,db=None):
        self.db = db

    def post(self):
        logging.info(self.request.body)
        _j = json.loads(self.request.body)
        _id = _j['action']['data']['card']['id']

        tr = trello.Trello()
        card = tr.get("cards/%s/actions" % _id,"&filter=all")[0]

        logging.info(card)
        df = process(card)

        import insert_df as s
        sql_query = s._write_mysql
        sql_query(df, "prospect", list(df.columns), self.db, ["trello_id"])

        self.write(_j)
        self.finish()

    def head(self):
        self.finish()

    def get(self):

        self.write("1")
        self.finish()


class WebApp(web.Application):

    def __init__(self,db):
        handlers = [
            (r"/webhook", WebhookHandler, {"db":db}),
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

