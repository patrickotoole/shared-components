import pandas as pd 
import logging

LINE_ITEMS = '''
SELECT v4.*, v2.conv, v2.attr_conv, c.line_item_name
FROM
(
    SELECT date(date_add(date, INTERVAL - 4 HOUR)) as date,  line_item_id, SUM(imps) as imps, SUM(media_cost) as media_cost, SUM(clicks) as clicks
    FROM reporting.v4_reporting
    WHERE external_advertiser_id = %(advertiser_id)s
    AND date(date_add(date, INTERVAL - 4 HOUR)) >= "%(start_date)s" AND date(date_add(date, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND active = 1 AND deleted = 0
    GROUP BY 1, 2
) v4
LEFT JOIN
(
    SELECT date(date_add(conversion_time, INTERVAL - 4 HOUR)) as date, line_item_id, COUNT(*) as conv, SUM(is_valid) as attr_conv
    FROM reporting.v2_conversion_reporting
    WHERE active =1  AND deleted = 0
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) >= "%(start_date)s"
    AND date(date_add(conversion_time, INTERVAL - 4 HOUR)) <= "%(end_date)s"
    AND external_advertiser_id = %(advertiser_id)s
    GROUP BY 1, 2
) v2
ON (v4.date = v2.date AND v4.line_item_id = v2.line_item_id)
JOIN
(
    SELECT line_item_id, line_item_name
    FROM rockerbox.advertiser_line_item 
    WHERE external_advertiser_id = %(advertiser_id)s
) c
ON (v4.line_item_id = c.line_item_id)
'''

class LineItemsDatabase(object):

    def get_data(self, advertiser_id, start_date, end_date):
        logging.info("retrieving data from db")
        data = self.db.select_dataframe(LINE_ITEMS%{'start_date':start_date, 'end_date': end_date, 'advertiser_id':advertiser_id})
        data['date'] = pd.to_datetime(data['date'])
        return data