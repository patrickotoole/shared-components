from lib.appnexus_reporting import load
import logging
import pandas as pd
import time

REQUEST_URL = "/line-item?advertiser_id=%s"

ADVERTISER_LINE_ITEM = '''
SELECT * FROM rockerbox.advertiser_line_item
WHERE external_advertiser_id = %s
'''

COLS = ['line_item_id','line_item_name','deleted', 'external_advertiser_id']

KEYS = ['line_item_id']


def get_advertiser_line_item(external_advertiser_id, db):
    df = db.select_dataframe(ADVERTISER_LINE_ITEM%external_advertiser_id)
    for c in COLS: assert c in df.columns
    return df[COLS]


def extract(external_advertiser_id, api):
    line_items = api.get_all_pages(REQUEST_URL%external_advertiser_id, "line-items")
    return line_items


def transform(data):
    df = pd.DataFrame(data)
    df = df.rename(columns={"id":"line_item_id","advertiser_id":"external_advertiser_id","name":"line_item_name"})
    df['deleted'] = False
    for c in COLS: assert c in df.columns
    df = df[COLS]
    return df

def process_deleted(df, advertiser_line_item):
    line_item_list = df['line_item_id'].tolist()
    advertiser_line_item['deleted'] = advertiser_line_item['line_item_id'].apply(lambda x: not x in line_item_list)
    df = pd.concat([df, advertiser_line_item[advertiser_line_item['deleted']==True]])
    return df


def insert(df, table, db):
    df = df.where(pd.notnull(df),None)    
    df = df.reset_index(drop = True)
    dl = load.DataLoader(db)
    dl.insert_df(df,table,KEYS,COLS)

    
def run(external_advertiser_id, api, db):

    data = extract(external_advertiser_id, api)
    df = transform(data)

    advertiser_line_item = get_advertiser_line_item(external_advertiser_id, db)
    df = process_deleted(df, advertiser_line_item)
    insert(df, "advertiser_line_item", db)
