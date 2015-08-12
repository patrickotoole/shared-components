import pandas as pd
from helpers import *

class PixelStatusAlert:
    def __init__(self):
        self.MESSAGE = (
            "*WARNING*: The following pixels have not fired for more than their "
            "specified threshold:"
            )
        self.sc = get_slack()
        self.r = get_rockerbox()
        self.db = get_mysql()
        
        self.bad_pixels = self.get_pixel_status()
        self.send_alerts()

    def send_alerts(self):
        print self.bad_pixels

        
        pass

    def get_pixel_status(self):
        alerts = pd.DataFrame(self.r.get("/pixel/alerts?format=json&active=1").json)
        status = pd.DataFrame(self.r.get("/pixel/status?format=json").json)
        
        alerts.external_segment_id = alerts.external_segment_id.apply(str)

        df = alerts.set_index("external_segment_id").join(status.set_index("segment_id"))
        
        df["send_alert"] = df.last_fired_seconds > df.alert_threshold_sec
        return df[df.send_alert]
        


p = PixelStatusAlert()
