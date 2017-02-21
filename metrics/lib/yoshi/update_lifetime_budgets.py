import pandas as pd
import json
import time
from pprint import pprint
import logging
import sys

ADVERTISERS = '''
SELECT DISTINCT external_advertiser_id
FROM rockerbox.advertiser
WHERE active = 1 AND running = 1 AND deleted = 0 AND media_trader_slack_name is not null AND media = 1
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

YOSHI_TESTING = '''
SELECT a.* FROM
rockerbox.advertiser_campaign a
LEFT JOIN rockerbox.advertiser_line_item b
ON (a.line_item_id = b.line_item_id)
WHERE a.external_advertiser_id = %(external_advertiser_id)s AND b.external_advertiser_id = %(external_advertiser_id)s
AND a.active = 1 AND a.deleted = 0
AND b.line_item_name LIKE "%%Yoshi Testing%%"
'''

def get_campaign_convs(rockerbox, external_advertiser_id):

    df = rockerbox.select_dataframe(CAMPAIGN_CONV%external_advertiser_id)
    assert 'campaign_id' in df.columns
    assert 'convs' in df.columns
    df['campaign_id'] = df['campaign_id'].astype(int)
    return df

def get_campaigns(rockerbox, external_advertiser_id):

    campaign_data = rockerbox.select_dataframe(YOSHI_TESTING%{'external_advertiser_id': external_advertiser_id})
    assert 'campaign_id' in campaign_data.columns
    assert 'campaign_name' in campaign_data.columns
    assert 'lifetime_budget_imps' in campaign_data.columns
    campaign_data['campaign_id'] = campaign_data['campaign_id'].astype(int)
    return campaign_data.fillna(0)


def get_lifetime_budget(rockerbox, external_advertiser_id):
    
    lifetime_budget = rockerbox.select_dataframe(LIFETIME_BUDGET%{'external_advertiser_id':external_advertiser_id})
    assert len(lifetime_budget) > 0
    return min(lifetime_budget['lifetime_budget_imps'].iloc[0], lifetime_budget['max_lifetime_budget_imps'].iloc[0]), lifetime_budget['num_campaigns'].iloc[0]


def load(rockerbox, advertisers):
    data = pd.DataFrame()
    for a in advertisers:

        lifetime_budget, num_campaigns = get_lifetime_budget(rockerbox, a)

        logging.info("extracting data for %s" %a)
        campaigns = get_campaigns(rockerbox, a)
        convs = get_campaign_convs(rockerbox, a)
        campaigns = pd.merge(campaigns, convs, left_on = 'campaign_id', right_on = 'campaign_id', how = 'left').fillna(0)

        logging.info("extracted with  %d rows " %len(campaigns))
        
        yoshi_testing = campaigns[  (campaigns['campaign_name'].apply(lambda x: 'yoshi' in x.lower())) &
                                    (campaigns['convs']==0) & 
                                    (campaigns['lifetime_budget_imps']!= lifetime_budget) & 
                                    (campaigns['lifetime_budget_imps']!= 0) & 
                                    (campaigns['lifetime_budget_imps'].apply(lambda x: not pd.isnull(x)))
                        ].copy(deep = True)


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


CAMPAIGN_URL = "/campaign?id=%s&advertiser_id=%s&logFilter=YoshiTestingLifetimeBudget"

def push(console_api, campaign_id, advertiser_id, new_budget, max_attempts = 5):

    attempts = 0
    camp_object = {'campaign':{'lifetime_budget_imps' : new_budget}}

    while True:

        if attempts >= max_attempts:
            logging.info("5 attempts unsuccessful for %s, skipping" %campaign_id)
            return

        r = console_api.put(CAMPAIGN_URL%(campaign_id, advertiser_id), data = json.dumps(camp_object) )
        resp = r.json.get('response')
        if resp.get('error'):
            attempts += 1
            logging.info("sleeping 60 secs")
            time.sleep(60)
        else:
            time.sleep(2)
            return


def run(rockerbox, console_api, advertisers):

    data = load(rockerbox, advertisers)
    
    for advertiser, group in data.groupby('external_advertiser_id'):

        num_campaigns = group['num_campaigns'].iloc[0]
        logging.info("Advertiser %s, %d Campaigns"%(advertiser, num_campaigns))
        for k, campaign in group.iloc[:num_campaigns].iterrows():

            campaign_id = campaign['campaign_id']
            old_budget = campaign['lifetime_budget_imps']
            new_budget = campaign['new_lifetime_budget_imps']

            if old_budget != new_budget:
                push(console_api,  campaign_id, advertiser, new_budget)



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
    run(rockerbox, console_api, advertisers)





