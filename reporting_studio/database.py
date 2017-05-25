import pandas as pd 
import logging

ALL_DATA = '''
SELECT v4.*, v2.conv, v2.conv_rb, c.campaign_name, c.line_item_name
FROM
(
    SELECT date(date_add(date, INTERVAL - 4 HOUR)) as date,  campaign_id, SUM(imps) as imps, SUM(media_cost) as media_cost
    FROM reporting.v4_reporting
    WHERE external_advertiser_id = %(advertiser_id)s
    AND date(date_add(date, INTERVAL - 4 HOUR)) >= "%(start_date)s" AND date(date_add(date, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND active = 1 AND deleted = 0
    GROUP BY 1, 2
) v4
LEFT JOIN
(
    SELECT date(date_add(conversion_time, INTERVAL - 4 HOUR)) as date, campaign_id, COUNT(*) as conv, SUM(is_valid) as conv_rb
    FROM reporting.v2_conversion_reporting v2
    WHERE active =1  AND deleted = 0
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) >= "%(start_date)s"
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND external_advertiser_id = %(advertiser_id)s
    GROUP BY 1, 2
) v2
ON (v4.date = v2.date AND v4.campaign_id = v2.campaign_id)
LEFT JOIN
(
    SELECT a.campaign_id, a.campaign_name, a.line_item_id, b.line_item_name
    FROM rockerbox.advertiser_campaign a
    JOIN rockerbox.advertiser_line_item b
    ON (a.line_item_id = b.line_item_id)
    WHERE a.external_advertiser_id = %(advertiser_id)s
    AND b.external_advertiser_id = %(advertiser_id)s
) c
ON (v4.campaign_id = c.campaign_id)
'''

CAMPAIGNS = '''
SELECT * FROM rockerbox.advertiser_campaign
WHERE external_advertiser_id = %(advertiser_id)s
'''

CAMPAIGN_NAME = '''
SELECT * FROM rockerbox.advertiser_campaign
WHERE campaign_id = %(campaign_id)s AND external_advertiser_id = %(advertiser_id)s
'''

class DataBase(object):


    def get_data(self, advertiser_id, start_date, end_date):

        logging.info("retrieving data from db")

        df = self.db.select_dataframe(ALL_DATA%{'advertiser_id': advertiser_id, 'start_date':start_date, 'end_date':end_date}).fillna(0)

        df['date'] = pd.to_datetime(df['date'])
        df['campaign_id'] = df['campaign_id'].astype(int).astype(str)
        logging.info("retrieved data")
        return df

    def get_campaigns(self, advertiser_id):
        df =  self.db.select_dataframe(CAMPAIGNS%{'advertiser_id':advertiser_id})
        df['campaign_id'] = df['campaign_id'].astype(int).astype(str)
        return df


    def get_campaign_tree_data(self, advertiser_id, campaign_id):

        campaign = self.db.select_dataframe(CAMPAIGN_NAME%{'advertiser_id':advertiser_id, 'campaign_id':campaign_id})

        campaign_name = campaign['campaign_name'].iloc[0]












