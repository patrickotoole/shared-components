import tornado.web
import ujson
import pandas as pd
from lib.helpers import *
from target import button_builder

MEMBER_ID = 181
PROFILE_ID = 5126120
SEGMENT_COLUMNS = [
    "action",
    "id",
    "name"
]
HIVE_QUERY = "select segment, sum(num_imps) from agg_domain_imps LATERAL VIEW explode(segments) segTable as segment where date='14-08-25' group by segment"


class ProfileHandler(tornado.web.RequestHandler):
    def initialize(self, bidder=None):
        self.bidder = bidder 

    def get_profile(self,profile_id=PROFILE_ID):
        URI = "/profile/%s/%s" % (MEMBER_ID,profile_id)
        profile = self.bidder.get(URI).json['response']['profile']

        return profile

    @decorators.formattable
    def get(self):
        profile = self.get_profile()
        data = pd.DataFrame(profile['segment_targets'])[SEGMENT_COLUMNS]
        data['imps'] = 0

        def default(self,data):
            data['actions'] = data.id.map(lambda name: button_builder(name, "delete", True))

            self.render("admin/bidder_profile.html",profile=Convert.df_to_json(data))

        yield default, (data,)

    def post(self):
        new_segment = ujson.loads(self.request.body)
        if new_segment:
            profile = self.get_profile()
            current_segments = profile['segment_targets']
            current_segments += [{"id":new_segment['id']}]
            profile['segment_targets'] = current_segments

            POST_DATA = ujson.dumps({"profile":profile})
            URI = "/profile/%s/%s" % (MEMBER_ID,PROFILE_ID)

            response = self.bidder.put(URI,data=POST_DATA).content

            self.write(response)


    def delete(self,segment_id):
        profile = self.get_profile()
        current_segments = profile['segment_targets']
        current_segments = [i for i in current_segments if i['id'] != int(segment_id)]
        profile['segment_targets'] = current_segments

        POST_DATA = ujson.dumps({"profile":profile})
        URI = "/profile/%s/%s" % (MEMBER_ID,PROFILE_ID)

        response = self.bidder.put(URI,data=POST_DATA).content

        self.write(response) 
