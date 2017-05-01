import pandas as pd 
import logging

query = '''
SELECT a.*, b.conv
FROM
(
    SELECT date(date_add(v4.date, INTERVAL - 4 HOUR)) as date, line_item_name, campaign_name,  SUM(imps) as imps, SUM(media_cost) as media_cost
    FROM reporting.v4_reporting v4
    JOIN rockerbox.advertiser_campaign a
    ON (v4.campaign_id = a.campaign_id)
    JOIN rockerbox.advertiser_line_item b
    ON (v4.line_item_id = b.line_item_id)
    WHERE v4.external_advertiser_id = %(advertiser_id)s AND a.external_advertiser_id = %(advertiser_id)s 
    AND b.external_advertiser_id = %(advertiser_id)s
    AND a.deleted = 0
    AND date(date_add(v4.date, INTERVAL - 4 HOUR)) >= "%(start_date)s" AND date(date_add(v4.date, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    GROUP BY 1, 2, 3
) a
LEFT JOIN
(
    SELECT date(date_add(conversion_time, INTERVAL - 4 HOUR)) as date, line_item_name, campaign_name, COUNT(*) as conv
    FROM reporting.v2_conversion_reporting v2
    WHERE active =1  AND deleted = 0 AND is_valid = 1
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) >= "%(start_date)s"
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND external_advertiser_id = %(advertiser_id)s
    GROUP BY 1, 2, 3
) b
ON (a.date = b.date AND a.campaign_name = b.campaign_name AND a.line_item_name = b.line_item_name)
'''




class DataBase(object):


    def get_data(self, advertiser_id, start_date, end_date):

        logging.info("retrieving data from db")

        df = self.db.select_dataframe(query%{'advertiser_id': advertiser_id, 'start_date':start_date, 'end_date':end_date}).fillna(0)

        df['date'] = pd.to_datetime(df['date'])
        logging.info("retrieved data")
        return df