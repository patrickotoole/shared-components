from link import lnk
import ujson
import hashlib
import zlib
import codecs
import datetime
import logging

ADVERTISER_QUERY = "select external_advertiser_id, pixel_source_name from advertiser where active =1 and deleted=0"
INSERT = "insert into yoshi_cache (advertiser, action_id, name, params_hash, zipped, date) values (%s, %s, %s, %s, %s, %s)"
REPLACE = "replace into yoshi_cache (advertiser, action_id, name, params_hash, zipped, date) values (%s, %s, %s, %s, %s, %s)"

class MediaplanCaching():

    def __init__(self, crushercache, db, hindsight):
        self.crushercache = crushercache
        self.db = db
        self.hindsight = hindsight

    def select_endpoint(self, advertiser):
        user ="a_%s" % advertiser
        self.hindsight.user = str(user)
        self.hindsight.authenticate()
        try:
            resp = self.hindsight.get("/crusher/adwords_mediaplan?plan=media", timeout=100)
            result = resp.json
        except:
            logging.info("error getting yoshi media plans")
            result = {"mediaplans":[]}
        return result

    def request_hindsight(self, url, advertiser):
        self.hindsight.user="a_%s" % advertiser
        self.hindsight.authenticate()
        if "filter_id" not in url:
            logging.info(url)
            logging.info("filter id not in url")
            return False
        resp = self.hindsight.get(url, timeout=1000)
        try:
            data = resp.json
        except:
            data = False
        return data

    def run_advertiser_endpoints(self,endpoints, advertiser):
        endpoints["response"] = endpoints.get("response",[])
        for endpoint in endpoints["response"]:
            name = endpoint['name']
            url = endpoint["endpoint"]
            resp  = self.request_hindsight(url, advertiser)
            if resp:
                compressed = self.compress_data(resp)
                hashed_endpoint = hashlib.md5(url).hexdigest()
                filter_id = url.split("filter_id=")[1].split("&")[0]
                date =datetime.datetime.now().strftime("%Y-%m-%d")
                self.write_to_db(advertiser, filter_id, name,hashed_endpoint,compressed, date)

    def compress_data(self,data):
        compressed = zlib.compress(ujson.dumps(data))
        hexify = codecs.getencoder('hex')
        compress_as_hex = hexify(compressed)
        return compress_as_hex[0]

    def write_to_db(self,advertiser, filter_id, name, hashed_endpoint, compressed,date):
        try:
            Q = INSERT
            self.crushercache.execute(Q, (advertiser, filter_id, name, hashed_endpoint, compressed, date))
        except:
            Q = REPLACE
            self.crushercache.execute(Q,  (advertiser, filter_id, name, hashed_endpoint, compressed, date))

    def get_advertisers(self):
        import requests
        data = requests.get("http://portal.getrockerbox.com/admin/pixel/advertiser_data",auth=("rockerbox","RBOXX2017"))
        return data.json()

def runner(**kwargs):
    crushercache = kwargs["crushercache"] if kwargs.get("crushercache", False) else kwargs["connectors"]["crushercache"]
    db = kwargs["rockerbox"] if kwargs.get("rockerbox",False) else kwargs["connectors"]["db"]
    hindsight = kwargs["hindsight"] if kwargs.get("hindsight",False) else kwargs["connectors"]["crusher_wrapper"]
    hindsight.authenticate()
    yc = MediaplanCaching(crushercache, db, hindsight)
    advertisers = yc.get_advertisers()
    for advertiser,segments in advertisers.items():
        endpoints = yc.select_endpoint(advertiser)
        yc.run_advertiser_endpoints(endpoints, advertiser)


if __name__ == "__main__":


    crushercache = lnk.dbs.crushercache
    db = lnk.dbs.rockerbox
    hindsight = lnk.api.crusher
    kwargs = {"crushercache":crushercache, "rockerbox":db, "hindsight":hindsight}
    runner(**kwargs)
