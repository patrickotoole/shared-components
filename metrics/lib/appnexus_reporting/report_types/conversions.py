from appnexus import AppnexusReport
from timeutils import *
from load import DataLoader
from log import *
from lib.report.utils.utils import parse_datetime

import pandas
import logging

CONVERSIONS_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "attributed_conversions",
        "timezone": "utc",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "filters": [
            {
                "advertiser_id": "%(advertiser_id)s"
            }
        ],
        "columns": [
            "advertiser_id",
            "pixel_id",
            "pixel_name",
            "line_item_id",
            "line_item_name",
            "campaign_id",
            "campaign_name",
            "creative_id",
            "creative_name",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id",
            "auction_id",
            "external_data",
            "imp_time",
            "datetime"
        ],
        "row_per": [
            "pixel_id",
            "pixel_name",
            "line_item_id",
            "campaign_id",
            "creative_id",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id"
        ],
        "pivot_report": false,
        "fixed_columns": [ ],
        "show_usd_currency": false,
        "orders": [
            "advertiser_id",
            "pixel_id",
            "pixel_name",
            "line_item_id",
            "line_item_name",
            "campaign_id",
            "campaign_name",
            "creative_id",
            "creative_name",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id",
            "auction_id",
            "external_data",
            "imp_time",
            "datetime"
        ]
    }
}
"""

COLS = ["external_advertiser_id","pixel_id","pixel_name","line_item_id","line_item_name","campaign_id","campaign_name", "pc", "order_id", "user_id", "auction_id", "imp_time", "conversion_time","creative_id","creative_name"]
KEYS = ["pixel_id","line_item_id","campaign_id","creative_id","order_id","user_id","auction_id","conversion_time"]

VALUES = [ v for v in COLS if v not in KEYS]


def get_report(db, api, advertiser_id, start_date, end_date):

    report_wrapper = AppnexusReport(api, db, advertiser_id, start_date, end_date, "conversions")
    form = CONVERSIONS_FORM % { "start_date": start_date, "end_date": end_date, "advertiser_id": advertiser_id }

    report_id = report_wrapper.request_report(advertiser_id,form)
    report_url = report_wrapper.get_report(report_id)
    report_IO = report_wrapper.download_report(report_url)

    return (pandas.read_csv(report_IO), report_wrapper.params)

def insert_report(db, table, df, report_params):

    dl = DataLoader(db)
    dl.insert_df(df,table,KEYS,COLS + ["source_report_id"])

    report_params['processed_at'] = now()
    log_processed(db,report_params)

    return df


ADVERTISER_PIXEL = '''
SELECT * FROM rockerbox.advertiser_pixel
WHERE external_advertiser_id = %s
'''

def _is_valid(row, pixel_data):
    conversion_time = parse_datetime(row['conversion_time'])
    imp_time = parse_datetime(row['imp_time'])

    time_diff = conversion_time - imp_time
    time_diff_hours = time_diff.days*24 + (time_diff.seconds/3600.)

    window_hours = pixel_data.ix[row['pixel_id']]['pc_window_hours'] if row['pc'] == 1 else pixel_data.ix[row['pixel_id']]['pv_window_hours'] 
    is_valid = time_diff_hours <= window_hours

    return is_valid

def get_pixel_data(db, advertiser_id):
    pixel_data = db.select_dataframe(ADVERTISER_PIXEL%advertiser_id)
    return pixel_data

    
def check_is_valid(db, df, advertiser_id):
    assert len(pixel_data) > 0
    assert 'pixel_id' in pixel_data.columns
    assert 'pc_window_hours' in pixel_data.columns
    assert 'pv_window_hours' in pixel_data.columns

    for pid in df['pixel_id'].unique(): assert pid in pixel_data['pixel_id'].unique()

    pixel_data = pixel_data.set_index('pixel_id')
    df['is_valid'] = df.apply(lambda row:  _is_valid(row, pixel_data), axis = 1)
    return df


def transform(df,report_params):

    df = df.rename(columns={"datetime":"conversion_time","advertiser_id":"external_advertiser_id","post_click_or_post_view_conv":"pc"})
    df['pc'] = df['pc'] == "Post Click"
    df['last_activity'] = now()
    df['source_report_id'] = report_params['report_id']
    return df

def run(api, db, table, advertiser_id, start_date, end_date):

    df, report_params = get_report(db,api,advertiser_id,start_date,end_date)

    if len(df) == 0: 
        report_params['processed_at'] = now()
        log_processed(db,report_params)
        logging.info("No row data found for %s conversion report: %s to %s" % (advertiser_id, start_date, end_date) )
        return df

    grouped_df = transform(df, report_params)

    grouped_df = check_is_valid(db, grouped_df, advertiser_id)
    insert_report(db, table, grouped_df.reset_index(), report_params)

