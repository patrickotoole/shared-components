import tornado.web
import ujson
import pandas
import StringIO
from tornado.httpclient import HTTPClient

boxes = [
    "162.243.254.140",
    "107.170.106.25",
    "162.243.242.74",
    "107.170.91.245",
    "162.243.85.197",
    "107.170.71.81",
    "107.170.34.108",
    "192.241.187.161",
    "107.170.4.34",
    "107.170.14.109",
    "107.170.116.84",
    "107.170.116.105",
    "107.170.116.94",
    "162.243.237.28",
    "107.170.160.19",
    "162.243.235.62",
    "107.170.146.225",
    "107.170.171.102",
    "162.243.218.228",
    "107.170.28.193",
    "162.243.224.211",
    "162.243.239.170",
]

class TargetingHandler(tornado.web.RequestHandler):
    def initialize(self, redis):
        self.redis = redis

    def get(self):
        profile = self.redis.get("profile")
        print profile
        self.write(profile)

    def post(self):
        self.redis.set("profile",self.request.body)
        http_client = HTTPClient() 
        for ip in boxes:
            print ip
            response = http_client.fetch("http://%s:8888/load_profile" % ip)
            #print response
        http_client.close()
