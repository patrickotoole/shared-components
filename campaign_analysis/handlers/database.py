import pandas as pd 
import logging

DATA = '''
SELECT v4.*, v2.conv, c.campaign_name, c.line_item_name
FROM
(
    SELECT date(date_add(date, INTERVAL - 4 HOUR)) as date,  campaign_id, SUM(imps) as imps, SUM(media_cost) as media_cost
    FROM reporting.v4_reporting
    WHERE external_advertiser_id = %(advertiser_id)s
    AND date(date_add(date, INTERVAL - 4 HOUR)) >= "%(start_date)s" AND date(date_add(date, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND active = 1 AND deleted = 0
    AND campaign_id IN (%(campaign_list)s)
    GROUP BY 1, 2
) v4
LEFT JOIN
(
    SELECT date(date_add(conversion_time, INTERVAL - 4 HOUR)) as date, campaign_id, COUNT(*) as conv
    FROM reporting.v2_conversion_reporting
    WHERE active =1  AND deleted = 0
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) >= "%(start_date)s"
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND external_advertiser_id = %(advertiser_id)s
    AND campaign_id IN (%(campaign_list)s)
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
    AND a.campaign_id IN (%(campaign_list)s)
) c
ON (v4.campaign_id = c.campaign_id)
'''


CAMPAIGNS = '''
SELECT a.*
FROM rockerbox.advertiser_campaign a
JOIN (
    SELECT * FROM rockerbox.advertiser_campaign
    WHERE campaign_id =  %(campaign_id)s
    AND external_advertiser_id = %(advertiser_id)s
) b 
ON a.campaign_name LIKE CONCAT('%%', b.campaign_name, '%%')'''

class DataBase(object):

    def get_data(self, advertiser_id, campaign_id, start_date, end_date):

        logging.info("retrieving data from db")
        campaigns = self.db.select_dataframe(CAMPAIGNS%{'campaign_id':campaign_id, 'advertiser_id':advertiser_id})
        campaign_list = ",".join(campaigns['campaign_id'].astype(str).tolist())
        # print DATA%{'start_date':start_date, 'end_date': end_date, 'advertiser_id':advertiser_id, 'campaign_list':campaign_list}
        data = self.db.select_dataframe(DATA%{'start_date':start_date, 'end_date': end_date, 'advertiser_id':advertiser_id, 'campaign_list':campaign_list})
        logging.info("retrieved data")

        data['date'] = pd.to_datetime(data['date'])
        data['campaign_id'] = data['campaign_id'].astype(str)
        data = data.fillna(0)
        
        return data












