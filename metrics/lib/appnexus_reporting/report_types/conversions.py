from appnexus import AppnexusReport
from timeutils import *
from load import DataLoader
from log import *

import pandas

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

COLS = ["external_advertiser_id","pixel_id","pixel_name","line_item_id","line_item_name","campaign_id","campaign_name", "pc", "order_id", "user_id", "auction_id", "imp_time", "conversion_time"]
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

def transform(df,report_params):

    df = df.rename(columns={"datetime":"conversion_time","advertiser_id":"external_advertiser_id","post_click_or_post_view_conv":"pc"})
    df['pc'] = df['pc'] == "Post Click"
    df['last_activity'] = now()
    df['source_report_id'] = report_params['report_id']

    return df

def run(api, db, table, advertiser_id, start_date, end_date):

    df, report_params = get_report(db,api,advertiser_id,start_date,end_date)
    grouped_df = transform(df, report_params)

    insert_report(db, table, grouped_df.reset_index(), report_params)

