import pandas as pd
from helpers import *

class PixelStatusAlert:
    def __init__(self):
        self.MESSAGE = (
            "*WARNING*: Data has not been written to the `%s` S3 bucket for at "
            "least 2 hours for the following advertisers: `%s`. You should check "
            "https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=%s to confirm."
            )
        self.sc = get_slack()
        self.c = get_cassandra()
        self.r = get_rockerbox()
        self.mysql = get_mysql()

    def get_pixel_status(self):
        mysql_q = "SELECT pixel_source_name, segment_name, CAST(external_segment_id AS CHAR) AS segment, alert_threshold_sec FROM pixel_alerts_view"
        q = "SELECT * FROM rockerbox.source_segment_timestamp"

        #df_status = pd.DataFrame(self.c.execute(q)).set_index("segment")
        df_info = self.mysql.select_dataframe(mysql_q).set_index("segment")
        #df_joined = df_info.join(df_status)
        #print df_joined

        data = self.r.get("/pixel/status?format=json").json
        print data


p = PixelStatusAlert()
p.get_pixel_status()


