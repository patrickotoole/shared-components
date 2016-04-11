from appnexus import AppnexusReport
from timeutils import *
from load import DataLoader
from log import *

import pandas
import logging

ANALYTICS_FORM = """
{
    "report": {
        "report_type": "advertiser_analytics",
        "timezone": "UTC",
        "filters": [
            {
                "seller_type": [
                    "Real Time"
                ]
            }
        ],
        "columns": [
            "hour",
            "imps",
            "clicks",
            "media_cost",
            "advertiser_id",
            "campaign_id",
            "creative_id",
            "seller_member",
            "line_item_id"
        ],
        "row_per": [
            "hour",
            "creative_id",
            "campaign_id"
        ],
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "format": "csv"
    }
}
"""

COLS = ["imps","clicks","media_cost","campaign_id","creative_id","line_item_id","external_advertiser_id","date"]
KEYS = ["date","external_advertiser_id","campaign_id","creative_id","line_item_id"]

VALUES = [ v for v in COLS if v not in KEYS]


def get_report(db, api, advertiser_id, start_date, end_date):

    report_wrapper = AppnexusReport(api, db, advertiser_id, start_date, end_date, "analytics")
    form = ANALYTICS_FORM % { "start_date": start_date, "end_date": end_date }

    report_id = report_wrapper.request_report(advertiser_id,form)
    report_url = report_wrapper.get_report(report_id)
    report_IO = report_wrapper.download_report(report_url)

    return (pandas.read_csv(report_IO), report_wrapper.params)

def insert_report(db, table, df, report_params):

    dl = DataLoader(db)
    dl.insert_df(df,table,KEYS,COLS + ["adx_spend","source_report_id"])

    report_params['processed_at'] = now()
    log_processed(db,report_params)

    return df

def transform(df,report_params):

    adx = df[df.seller_member.map(lambda x: "(181)" in x)].groupby(KEYS)[VALUES].sum().reset_index()
    adx = adx.rename(columns={"media_cost":"adx_spend"})
    adx = adx.T.ix[COLS + ["adx_spend"]].T.fillna(0.0)

    non_adx = df[df.seller_member.map(lambda x: "(181)" not in x)].groupby(KEYS)[VALUES].sum()
    non_adx = non_adx.reset_index().T.ix[COLS + ["adx_spend"]].T.fillna(0.0)

    grouped_df = adx.append(non_adx).groupby(KEYS).sum()
    grouped_df['media_cost'] = grouped_df.media_cost + grouped_df.adx_spend
    grouped_df['source_report_id'] = report_params['report_id']

    return grouped_df

def run(api, db, table, advertiser_id, start_date, end_date):

    df, report_params = get_report(db,api,advertiser_id,start_date,end_date)
    if len(df) == 0: 
        report_params['processed_at'] = now()
        log_processed(db,report_params)
        logging.info("No row data found for %s analytics report: %s to %s" % (advertiser_id, start_date, end_date) )
        return df

    df = df.rename(columns={"hour":"date","advertiser_id":"external_advertiser_id"})
    
    grouped_df = transform(df,report_params)

    return insert_report(db, table, grouped_df.reset_index(), report_params)

