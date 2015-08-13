from lib.helpers import Convert
import pandas as pd
from helpers import *

class PixelStatusAlert:
    def __init__(self):
        self.MESSAGE = (
            "*WARNING*: The following pixels have not fired for more than their "
            "specified threshold:\n\n```\n%s\n```\nVisit http://portal.getrockerbox.com/admin/pixel/status to confirm.\n"
            "Change thresholds here: http://portal.getrockerbox.com/admin/pixel/alerts"
            )

        self.users = {}
        self.sc = get_slack()
        self.r = get_rockerbox()
        self.db = get_mysql()
        
        self.bad_pixels = Convert.df_to_values(self.get_pixel_status())
        self.build_alerts()
        self.send_alerts()

    def send_alerts(self):
        for trader,messages in self.alerts.iteritems():
            message = self.MESSAGE % '\n'.join(messages)
            slack_uid = get_slack_user(trader, self.sc, self.users)
            print "Sending message: %s" % message
            self.sc.api_call("chat.postMessage",channel=slack_uid,text=message,as_user=True)

    def construct_message(self, data):
        m = '"%(segment_name)s" (%(segment_id)s) last fired %(last_fired_pretty)s, (threshold = %(alert_threshold_sec)s sec)' % data
        return m

    def build_alerts(self):
        self.alerts = {}
        slack_key = advertiser_to_media_trader(self.db)

        for pixel in self.bad_pixels:
            if pixel["advertiser"] in slack_key:
                trader = slack_key[pixel["advertiser"]]
            else:
                continue
            if trader not in self.alerts:
                self.alerts[trader] = []
            self.alerts[trader].append(self.construct_message(pixel))

    def get_pixel_status(self):
        alerts = pd.DataFrame(self.r.get("/pixel/alerts?format=json&active=1").json)
        status = pd.DataFrame(self.r.get("/pixel/status?format=json").json)
        
        alerts.external_segment_id = alerts.external_segment_id.apply(str)

        df = alerts.set_index("external_segment_id").join(status.set_index("segment_id")).reset_index()
        df["segment_id"] = df["index"]
        del df["index"]
        
        df["send_alert"] = df.last_fired_seconds > df.alert_threshold_sec
        return df[df.send_alert]

p = PixelStatusAlert()
