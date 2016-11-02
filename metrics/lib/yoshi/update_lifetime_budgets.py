import pandas as pd
import json
import time
from pprint import pprint
import logging
import sys

ADVERTISERS = '''
SELECT DISTINCT external_advertiser_id
FROM rockerbox.advertiser
WHERE active = 1 AND running = 1 AND deleted = 0 AND media_trader_slack_name is not null
AND external_advertiser_id IN (SELECT DISTINCT external_advertiser_id FROM rockerbox.yoshi_campaign_domains)
AND external_advertiser_id IN (SELECT DISTINCT external_advertiser_id FROM rockerbox.yoshi_lifetime_budgets WHERE active =1 )
'''

LIFETIME_BUDGET = '''
SELECT * FROM rockerbox.yoshi_lifetime_budgets WHERE external_advertiser_id = %(external_advertiser_id)s
'''


RULE_GROUP_ID = '''
SELECT * FROM reporting.opt_rules WHERE rule_group_name = "yoshi_testing_imps_threshold" AND active = 1 
'''

CAMPAIGN_CONV = '''
SELECT campaign_id, COUNT(*) as convs
FROM reporting.v2_conversion_reporting
WHERE external_advertiser_id = %s
AND active = 1 AND deleted = 0
AND is_valid = 1
AND conversion_time >= "2015-01-01"
GROUP BY 1
'''

def get_campaign_convs(rockerbox, external_advertiser_id):

    df = rockerbox.select_dataframe(CAMPAIGN_CONV%external_advertiser_id)
    assert 'campaign_id' in df.columns
    assert 'convs' in df.columns
    df['campaign_id'] = df['campaign_id'].astype(int)
    return df

def get_campaigns(console_api, external_advertiser_id):
    request_url = "/campaign?advertiser_id=%s&state=active&start_element=%s&num_elements=100"
    campaign_data = []
    campaign_cols = ['id','name','lifetime_budget_imps']

    s = 0
    while True:
        r = console_api.get(request_url%(external_advertiser_id, s))
        
        if 'error' in r.json['response']:
            logging.info("sleeping 200 secs")
            time.sleep(200)
            
        elif len(r.json['response']['campaigns']) == 0:
            break
        else:   
            for campaign in r.json['response']['campaigns']:            
                campaign_data.append(campaign)
            s += 100

    assert len(campaign_data) > 0

    campaign_data = pd.DataFrame(campaign_data)
    assert 'id' in campaign_data.columns
    assert 'name' in campaign_data.columns
    assert 'lifetime_budget_imps' in campaign_data.columns

    campaign_data.rename(columns={'id': 'campaign_id', 'name': 'campaign_name'}, inplace=True)
    campaign_data['campaign_id'] = campaign_data['campaign_id'].astype(int)
    return campaign_data.fillna(0)





def get_lifetime_budget(rockerbox, external_advertiser_id):
    
    lifetime_budget = rockerbox.select_dataframe(LIFETIME_BUDGET%{'external_advertiser_id':external_advertiser_id})
    assert len(lifetime_budget) > 0
    return min(lifetime_budget['lifetime_budget_imps'].iloc[0], lifetime_budget['max_lifetime_budget_imps'].iloc[0]), lifetime_budget['num_campaigns'].iloc[0]


def load(console_api, rockerbox, advertisers):
    data = pd.DataFrame()
    for a in advertisers:

        lifetime_budget, num_campaigns = get_lifetime_budget(rockerbox, a)

        logging.info("extracting data for %s" %a)
        campaigns = get_campaigns(console_api, a)
        convs = get_campaign_convs(rockerbox, a)
        campaigns = pd.merge(campaigns, convs, left_on = 'campaign_id', right_on = 'campaign_id', how = 'left').fillna(0)

        logging.info("extracted with  %d rows " %len(campaigns))
        
        yoshi_testing = campaigns[  (campaigns['campaign_name'].apply(lambda x: 'yoshi' in x.lower())) &
                                    (campaigns['convs']==0) & 
                                    (campaigns['lifetime_budget_imps']!= lifetime_budget) & 
                                    (campaigns['lifetime_budget_imps']!= 0) & 
                                    (campaigns['lifetime_budget_imps'].apply(lambda x: not pd.isnull(x)))
                        ]


        logging.info("filtered to %d rows " %len(yoshi_testing))
        yoshi_testing['new_lifetime_budget_imps'] = lifetime_budget
        yoshi_testing['num_campaigns'] = num_campaigns
        yoshi_testing['external_advertiser_id'] = a
        data = pd.concat([data, yoshi_testing])

    logging.info("loaded data with %d rows" %len(data))

    assert 'new_lifetime_budget_imps' in data.columns
    assert 'external_advertiser_id' in data.columns
    assert 'lifetime_budget_imps' in data.columns
    assert 'campaign_id' in data.columns
    return data


def push(rbox_api,  campaign_id, old_budget, new_budget, rule_group_id):

    attempts = 0
    log = {
            "rule_group_id": rule_group_id,
            "object_modified": 'campaign',
            "campaign_id": campaign_id,
            "field_name": 'lifetime_budget_imps',
            "field_old_value": old_budget,
            "field_new_value": new_budget,
            "metric_values": {}
        }

    while True:

        if attempts >= 5:
            logging.info("5 attempts unsuccessful for %s, skipping" %campaign_id)
            return

        r = rbox_api.post("/opt_log", data = json.dumps(log))
        logging.info(r.json)
        if r.json['status'] == "ok":
            time.sleep(2)
            return
        else:
            logging.info("sleeping 60 secs")
            time.sleep(60)
            attempts += 1
    

def run(rockerbox, rbox_api, console_api, advertisers):

    data = load(console_api, rockerbox, advertisers)
    rule_group_id = rockerbox.select_dataframe(RULE_GROUP_ID)['rule_group_id'].iloc[0]
    
    for advertiser, group in data.groupby('external_advertiser_id'):

        num_campaigns = group['num_campaigns'].iloc[0]
        logging.info("Advertiser %s, %d Campaigns"%(advertiser, num_campaigns))

        for k, campaign in group.head(num_campaigns).iterrows():

            campaign_id = campaign['campaign_id']
            old_budget = campaign['lifetime_budget_imps']
            new_budget = campaign['new_lifetime_budget_imps']

            if old_budget != new_budget:
                push(rbox_api,  campaign_id, old_budget, new_budget, rule_group_id)



if __name__ == "__main__":

    from link import lnk
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)
    parse_command_line()
    basicConfig(options=options)
    
    rockerbox = lnk.dbs.rockerbox
    rbox_api = lnk.api.rockerbox
    console_api = lnk.api.console
    
    if len(sys.argv) > 1:
        advertisers = sys.argv[1].split(",")
    else:
        advertisers = rockerbox.select_dataframe(ADVERTISERS)['external_advertiser_id'].tolist()
    
    assert len(advertisers) > 0
    run(rockerbox, rbox_api, console_api,advertisers)





