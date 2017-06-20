import pandas as pd 
import logging

LINE_ITEMS = '''
SELECT v4.*, v2.conv, v2.attr_conv, c.line_item_name, c.funnel
FROM
(
    SELECT date(date_add(date, INTERVAL - 4 HOUR)) as date,  line_item_id, SUM(imps) as imps, SUM(media_cost) as media_cost, SUM(clicks) as clicks,
    COUNT(DISTINCT campaign_id) as num_campaigns
    FROM reporting.v4_reporting
    WHERE external_advertiser_id = %(advertiser_id)s
    AND date>= "%(start_date)s" AND date <= "%(end_date)s"
    AND active = 1 AND deleted = 0
    GROUP BY 1, 2
) v4
LEFT JOIN
(
    SELECT date(date_add(conversion_time, INTERVAL - 4 HOUR)) as date, line_item_id, COUNT(*) as conv, SUM(is_valid) as attr_conv
    FROM reporting.v2_conversion_reporting
    WHERE active =1  AND deleted = 0
    AND conversion_time >= "%(start_date)s"
    AND conversion_time <= "%(end_date)s"
    AND external_advertiser_id = %(advertiser_id)s
    GROUP BY 1, 2
) v2
ON (v4.date = v2.date AND v4.line_item_id = v2.line_item_id)
JOIN
(
    SELECT a.line_item_id, a.line_item_name, CONCAT(b.parent_type," ",b.name) as funnel
    FROM rockerbox.advertiser_line_item a
    LEFT JOIN rockerbox.line_item_hierarchy b
    ON (a.line_item_id = b.line_item_id)
    WHERE external_advertiser_id = %(advertiser_id)s
) c
ON (v4.line_item_id = c.line_item_id)
'''

OPTS = '''
SELECT date(a.created_at) as date, b.line_item_id, a.query_filter as optimization, COUNT(*) as num_opts
FROM reporting.appnexus_proxy_logs a
JOIN rockerbox.advertiser_campaign b
ON (a.appnexus_id = b.campaign_id)
WHERE a.advertiser_id =  %(advertiser_id)s
AND a.created_at >= "%(start_date)s" AND a.created_at <= "%(end_date)s"
AND a.object_type = "campaign"
AND b.external_advertiser_id = %(advertiser_id)s
GROUP BY 1, 2, 3
UNION ALL 
SELECT date(a.created_at) as date, b.line_item_id, a.query_filter as optimization, COUNT(*) as num_opts
FROM reporting.appnexus_proxy_logs a
JOIN rockerbox.advertiser_campaign b
ON (a.appnexus_id = b.profile_id)
WHERE a.advertiser_id =  %(advertiser_id)s
AND a.created_at >= "%(start_date)s" AND a.created_at <= "%(end_date)s"
AND a.object_type = "profile"
AND b.external_advertiser_id =  %(advertiser_id)s
GROUP BY 1, 2, 3
'''

class LineItemsDatabase(object):

    def get_data(self, advertiser_id, start_date, end_date):
        logging.info("retrieving data from db")
        data = self.db.select_dataframe(LINE_ITEMS%{'start_date':start_date, 'end_date': end_date, 'advertiser_id':advertiser_id})
        data['date'] = pd.to_datetime(data['date'])
        data['line_item_id'] = data['line_item_id'].astype(int).astype(str)
        data['funnel'] = data['funnel'].fillna("Misc")

        data = data.fillna(0)
        return data

    def get_opts_from_db(self, advertiser_id, start_date, end_date):
        logging.info("retrieving optimizations from db")
        data = self.db.select_dataframe(OPTS%{'start_date':start_date, 'end_date': end_date, 'advertiser_id':advertiser_id})
        data['date'] = pd.to_datetime(data['date'])
        data['line_item_id'] = data['line_item_id'].astype(int).astype(str)
        data = data.fillna(0)
        return data



