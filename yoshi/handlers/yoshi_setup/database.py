import logging
import pandas as pd
from lib.appnexus_reporting import load

YOSHI_SETUP = '''
SELECT mediaplan, num_domains, line_item_name, active
FROM yoshi_setup
WHERE external_advertiser_id = %s
'''

MEDIAPLANS = '''
SELECT a.* FROM
(
    SELECT name, endpoint, last_activity
    FROM adwords_campaign_endpoint
    WHERE advertiser_id = %(advertiser_id)s
    AND active = 1 AND deleted = 0
) a
JOIN
(
    SELECT name, max(last_activity) as last_activity
    FROM adwords_campaign_endpoint
    WHERE advertiser_id = %(advertiser_id)s
    AND active = 1 AND deleted = 0
    GROUP BY 1
) b
ON(a.name = b.name AND a.last_activity = b.last_activity)
'''

LINE_ITEMS = '''
SELECT line_item_name, MAX(line_item_id) as line_item_id, num_campaigns
FROM
(
    SELECT a.line_item_id, max(a.line_item_name) as line_item_name, COUNT(DISTINCT campaign_id)  as num_campaigns
    FROM advertiser_line_item a
    LEFT JOIN advertiser_campaign b
    ON (a.line_item_id = b.line_item_id)
    WHERE a.external_advertiser_id = %(advertiser_id)s 
    GROUP BY 1
    HAVING num_campaigns < 500
) l
GROUP BY 1
'''


COLUMNS =  ['external_advertiser_id','mediaplan', 'num_domains', 'line_item_name', 'active']

def process_endpoint(endpoint):
    return endpoint.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id') + '&prevent_sample=true&num_days=2'

class SetupDatabase(object):

    def insert(self, data):
        columns = ['external_advertiser_id','mediaplan', 'num_domains', 'line_item_name', 'active']
        dl = load.DataLoader(self.db)

        if len(data) > 0:
            for c in columns:
                assert c in data.columns

            dl.insert_df(data, "yoshi_setup",[], columns)

    def get_yoshi_setup(self, advertiser_id):
        df = self.db.select_dataframe(YOSHI_SETUP%advertiser_id)
        return df

    def get_media_plan_endpoints(self, advertiser_id):
        df = self.crushercache.select_dataframe(MEDIAPLANS%{'advertiser_id':advertiser_id})
        df['endpoint'] = df['endpoint'].apply(process_endpoint)
        return df

    def get_line_items(self, advertiser_id):
        return self.db.select_dataframe(LINE_ITEMS%{'advertiser_id':advertiser_id})

