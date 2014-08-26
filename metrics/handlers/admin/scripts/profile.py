import tornado.web
import ujson
import pandas as pd

MEMBER_ID = 181
PROFILE_ID = 5126120
SEGMENT_COLUMNS = [
    "action",
    "id",
    "name"
]


class ProfileHandler(tornado.web.RequestHandler):
    def initialize(self, bidder=None):
        self.bidder = bidder 

    def get_profile(self,profile_id=PROFILE_ID):
        URI = "/profile/%s/%s" % (MEMBER_ID,profile_id)
        profile = self.bidder.get(URI).json['response']['profile']

        return profile

    def get(self):
        profile = self.get_profile()
        segments_df = pd.DataFrame(profile['segment_targets'])[SEGMENT_COLUMNS]
        self.write(segments_df.to_html())

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

        
        
        pass
