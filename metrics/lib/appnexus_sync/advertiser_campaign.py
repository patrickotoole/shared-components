from lib.appnexus_reporting import load
import logging
import pandas as pd

REQUEST_URL = "/campaign?advertiser_id=%s"

ADVERTISER_CAMPAIGN = '''
SELECT * FROM rockerbox.advertiser_campaign
WHERE external_advertiser_id = %s
'''

COLS = ['campaign_id','campaign_name','active','deleted', 'external_advertiser_id', 'line_item_id', 
        'profile_id', 'base_bid', 'max_bid',
        'daily_budget', 'daily_budget_imps','impression_limit', 
        'lifetime_budget','lifetime_budget_imps']

KEYS = ['campaign_id']

def get_advertiser_campaign(external_advertiser_id, db):
    df = db.select_dataframe(ADVERTISER_CAMPAIGN%external_advertiser_id)
    for c in COLS: assert c in df.columns
    return df[COLS]


def extract(external_advertiser_id, api):
    campaigns = api.get_all_pages(REQUEST_URL%external_advertiser_id, "campaigns")
    return campaigns


def transform(data):
    df = pd.DataFrame(data)
    df = df.rename(columns={"id":"campaign_id","advertiser_id":"external_advertiser_id","name":"campaign_name"})
    assert 'state' in df.columns
    assert len(df) > 0
    df['active'] = df['state'].apply(lambda x: x == 'active')
    df['deleted'] = False
    
    for c in COLS:
        assert c in df.columns
    
    return df[COLS]

def process_deleted(df, advertiser_campaign):
    campaign_list = df['campaign_id'].tolist()
    advertiser_campaign['deleted'] = advertiser_campaign['campaign_id'].apply(lambda x: not x in campaign_list)
    df = pd.concat([df, advertiser_campaign[advertiser_campaign['deleted']==True]])
    return df

def insert(df, table, db):
    df = df.where(pd.notnull(df),None)    
    df = df.reset_index()
    dl = load.DataLoader(db)
    dl.insert_df(df,table,KEYS,COLS)

    
def run(external_advertiser_id, api, db):

    data = extract(external_advertiser_id, api)
    df = transform(data)
    advertiser_campaign = get_advertiser_campaign(external_advertiser_id, db)
    df = process_deleted(df, advertiser_campaign)
    insert(df, "advertiser_campaign", db)