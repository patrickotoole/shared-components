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

def build_card(_id,name,related_cards):
    return {
        "due":None,
        "idList": str(_id),
        "idBoard": "56cf1874e735e6e2e9aa508b",
        "name":name,
        "urlSource": None,
        "desc": related_cards
    }

class WebhookHandler(web.RequestHandler):

    def initialize(self,db=None):
        self.db = db
        self.tr = trello.Trello()

    def insert_details(self,trello_id):
        df = self.db.select_dataframe("select * from prospect_details where trello_id = '%s'" % trello_id)
        if len(df) == 0:
            self.db.execute("insert into prospect_details (trello_id) VALUES ('%s')" % trello_id)

    def insert_tracking(self,trello_id):
        df = self.db.select_dataframe("select * from prospect_tracking where trello_id = '%s'" % trello_id)
        if len(df) == 0:
            self.db.execute("insert into prospect_tracking (trello_id) VALUES ('%s')" % trello_id)

    def get_or_create_brand(self,brand,agency):

        from run_brand import find_related, build_links, build_card, SELECT, INSERT

        Q = "SELECT * FROM prospect_brand where agency = '%s' and brand = '%s'"
        df = self.db.select_dataframe(Q % (agency,brand))

        if (len(df) == 0):
            all_entries = self.db.select_dataframe(SELECT)
 
            boards = self.tr.get_board_lists("Accounts").set_index("name")
            _id = boards.ix["Brand"].id

            related = find_related(agency,brand,all_entries)
            related_links = build_links(related)

            name = "%s - %s" % (brand,agency)

            card = build_card(_id,name,related_links)

            j = json.dumps(card)
            tr_card = self.tr.post("cards",data=j)

            from datetime import datetime
            trello_id = tr_card['id']
            obj = {
                "board": "Brand",
                "trello_id": trello_id,
                "brand": brand,
                "agency": agency,
                "created_at": datetime.fromtimestamp(int(trello_id[0:8],16))
            }
            self.db.execute(INSERT % obj)
        else:
            trello_id = df.iloc[0].trello_id

        return trello_id

    def insert_brand(self,trello_id):
        logging.info("select * from prospect where trello_id = '%s'" % trello_id)
        df = self.db.select_dataframe("select * from prospect where trello_id = '%s'" % trello_id)
        logging.info(df)
        if df.brand_trello_id.iloc[0] is None or len(df.brand_trello_id.iloc[0]) == 0:
            logging.info("HERE")
            brand_trello = self.get_or_create_brand(df.brand.iloc[0],df.agency.iloc[0])
            self.db.execute("UPDATE prospect set brand_trello_id = %s where trello_id = %s" % (brand_trello,trello_id))

    def get_or_create_agency(self,agency):
        return 1

    def insert_agency(self,trello_id):
        df = self.db.select_dataframe("select * from prospect where trello_id = '%s'" % trello_id)
        if len(df.agency_trello_id.iloc[0]) == 0:
            #agency_trello = self.get_or_create_agency(df.agency.iloc[0])
            #self.db.execute("UPDATE prospect set agency_trello_id = %s where trello_id = %s" % (agency_trello,trello_id))
            pass



    def post(self):
        logging.info(self.request.body)
        _j = json.loads(self.request.body)
        _id = _j['action']['data']['card']['id']

        tr = self.tr 
        card = tr.get("cards/%s/actions" % _id,"&filter=all")[0]

        logging.info(card)
        df = process(card)

        import insert_df as s
        sql_query = s._write_mysql
        sql_query(df, "prospect", list(df.columns), self.db, ["trello_id"])

        self.insert_details(df.trello_id[0])
        self.insert_tracking(df.trello_id[0])
        self.insert_brand(df.trello_id[0])



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

