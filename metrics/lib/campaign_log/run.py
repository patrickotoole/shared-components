import ujson
import pandas as pd
import logging
from lib.appnexus_reporting import load

ADVERTISERS = '''
SELECT * FROM rockerbox.advertiser
WHERE active = 1 AND deleted = 0 AND running = 1 AND media = 1
'''

QUERY = '''
SELECT * FROM appnexus_proxy_logs WHERE object_type = "campaign" 
AND created_at >= date_add(NOW(),interval -100 day)
AND advertiser_id = %s
ORDER BY appnexus_id, created_at ASC
'''

COLS = ['old','new', 'field', 'updated_at', 'log_id', 'campaign_id']
KEYS = ['log_id','campaign_id','field']

def extract(db, advertiser_id):
    df = db.select_dataframe(QUERY%advertiser_id)
    assert 'id' in df.columns
    assert 'data' in df.columns
    assert 'created_at' in df.columns
    assert 'query_filter' in df.columns
    assert 'appnexus_id' in df.columns
    return df
    
def change_log(df):
    change_log = []
    old_state = {}
    for k, row in df.iterrows():
        new_state = row['campaign']
        y = [{'old':old_state.get(field), 
              'new':new_state.get(field), 
              'field':field, 
              'updated_at': row['created_at'],
              'log_id': row['id']} for field in new_state.keys() if old_state.get(field) != new_state.get(field)]
        change_log.extend(y)
        old_state = new_state
    change_log = pd.DataFrame(change_log)
    return change_log
    
    
def transform(df):
    df['campaign'] = df['data'].apply(lambda x: ujson.loads(x).get('campaign'))
    df = df.groupby('appnexus_id').apply(change_log).reset_index()
    df = df.rename(columns={'appnexus_id': 'campaign_id'})
    df['new'] = df['new'].astype(str)
    df['old'] = df['old'].astype(str)
    return df[COLS]

    
def insert(df, table, db):
    dl = load.DataLoader(db)
    dl.insert_df(df,table,KEYS,COLS)


def run(db):
    
    advertisers = db.select_dataframe(ADVERTISERS)
    for advertiser_id in advertisers['external_advertiser_id']:
        logging.info("running advertiser %s" %advertiser_id)
        df = extract(db, advertiser_id)
        if len(df) > 0:
            df = transform(df)
            insert(df, "campaign_change_log", db)


if __name__ == "__main__":
    from link import lnk

    from lib.report.utils.options import define
    from lib.report.utils.options import options

    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)

    db = lnk.dbs.reporting
    run(db)

