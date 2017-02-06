import pandas
import json
import logging

import extract 
import transform
from transform import *
from campaign_lib.create.load import push_campaigns, update_campaigns, deactivate_campaigns
from helper import *

def extract_and_group(df,GROUPBY,params,_c):

    assert len(GROUPBY) > 0
    assert GROUPBY in df.columns
    assert len(params.items()) > 0
    assert _c is not None 

    df = extract.get_mobile_targets(df,_c) 
    df = extract.format_venue_targets(df) 

    aggs = extract.build_agg_funcs(df,GROUPBY)
    grouped = extract.run_agg(df,GROUPBY,aggs)

    grouped = extract.get_campaign_profile_objects(grouped,_c,params)
    grouped = grouped.set_index(GROUPBY)
    grouped = grouped[grouped.original_campaign != ""]

    if params['breakout']:
        grouped = df.merge(grouped.reset_index(),left_on="campaign_id",right_on="campaign_id",suffixes=("","_r"))
        cols = get_cols(df)
        for c in cols:
            grouped[c] = grouped[c].map(lambda x: [x])

    if params['create'] or params['deactivate'] or params['modify'] or params['duplicate'] or params['replace']:
        grouped = grouped.reset_index()

    assert len(grouped.columns) > 0
    assert GROUPBY in grouped.columns

    return grouped

def build_objects(grouped,ADVERTISER,LINE_ITEM,params):

    assert len(grouped) > 0
    assert len(ADVERTISER) > 0
    assert len(params.items()) > 0


  
    for campaign, row in grouped.iterrows():

        # make profile
        items = row.to_dict().items()
        profile_overrides = transform.build_profile_overrides(items,params)
        new_profile = json.loads(grouped.ix[campaign,'original_profile'])
        transform.modify_exisiting_profile(new_profile,profile_overrides,ADVERTISER,params['append'])

        # make campaign
        new_campaign = json.loads(grouped.ix[campaign,'original_campaign']) 
        if not params['modify']: 
            transform.modify_exisiting_campaign(new_campaign,LINE_ITEM)
        transform.build_campaign_name(new_campaign,new_profile,params)
        transform.set_campaign_budget(new_campaign,dict(items))
        transform.set_campaign_budget_overrides(new_campaign,params)

        # set object to df
        grouped.ix[campaign,'profile'] = json.dumps(new_profile) 
        grouped.ix[campaign,'campaign'] = json.dumps(new_campaign)
        grouped.ix[campaign,'campaign_name'] = new_campaign['name'] 

    return grouped

def remove_duplicates(grouped,LINE_ITEM,_c):
    assert "campaign_name" in grouped.columns
    assert str(int(LINE_ITEM)) == LINE_ITEM

    resp = _c.get("/line-item?id=%s" % LINE_ITEM).json['response']['line-item']['campaigns']
    campaigns = pandas.DataFrame(resp)
    if len(campaigns) > 0:
        new_grouped = grouped.merge(campaigns,left_on="campaign_name",right_on="name",how="left")
        new_grouped = new_grouped[new_grouped.state.isnull()]
    else:
        new_grouped = grouped

    return new_grouped
    

def push_changes(grouped,ADVERTISER,LINE_ITEM,params,_c,name=""):
    assert len(params.items()) > 0
    assert len(grouped) > 0
    assert str(int(ADVERTISER)) == ADVERTISER

    if params['modify']:
        update_campaigns(grouped,ADVERTISER,name)
        logging.info("opt - %s updated %s new campaigns" % (name,len(grouped)) )
        return

    if params['create'] or params['duplicate'] or params['replace']:

        assert str(int(LINE_ITEM)) == LINE_ITEM
        deduped = remove_duplicates(grouped,LINE_ITEM,_c)
        push_campaigns(deduped,ADVERTISER,LINE_ITEM,name)
        logging.info("opt - %s created %s new campaigns in %s" % (name,len(deduped),LINE_ITEM) )

    if params['replace']:
        deactivate_campaigns(grouped['campaign_id'].tolist(),_c, name)

    


def runner(params,data,_c,name=""):


    LINE_ITEM = params['line_item_id']
    ADVERTISER = params['advertiser']
    GROUPBY = params["create_group"] if params["create_group"] and params["create_group"] != "" else "campaign_id"

    logging.info("opt - running %s for %s %s %s" % (name, ADVERTISER,LINE_ITEM,GROUPBY) )

    df = pandas.DataFrame(data)

    if len(df) == 0:
        return # skip building

    df['line_item'] = LINE_ITEM

    grouped = extract_and_group(df,GROUPBY,params,_c)
    logging.info("opt - grouped and pulled objects.")

    if params['deactivate']:
        deactivate_campaigns(grouped.campaign_id,_c,name)
        logging.info("opt - %s - deactivation complete." % name)
        return 

    budget_items = df.set_index("campaign_id")[[c for c in df.columns if c in CAMPAIGN_FIELDS]]
    if len(budget_items.columns) > 0:
        grouped = grouped.merge(budget_items.reset_index(),left_on="campaign_id",right_on="campaign_id",how="left")

    for k,v in transform.FIELD_NAMES.items():
        if k in grouped.columns: params[v] = params['action']

    grouped = build_objects(grouped,ADVERTISER,LINE_ITEM,params)
    logging.info("opt - built new objects for updates.")
    push_changes(grouped,ADVERTISER,LINE_ITEM,params,_c,name)
    logging.info("opt - finished %s for %s %s %s" % (name,ADVERTISER,LINE_ITEM,GROUPBY) )
