import pandas
import json

import extract 
import transform
from transform import *
from ..create.load import push_campaigns, update_profiles
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

    if params['create'] or params['deactivate']:
        grouped = grouped.reset_index()

    assert len(grouped.columns) > 0
    assert GROUPBY in grouped.columns

    return grouped

def build_objects(grouped,ADVERTISER,LINE_ITEM,params):
  
    for campaign, row in grouped.iterrows():

        # make profile
        items = row.to_dict().items()
        profile_overrides = transform.build_profile_overrides(items,params)
        new_profile = json.loads(grouped.ix[campaign,'original_profile'])
        transform.modify_exisiting_profile(new_profile,profile_overrides,ADVERTISER,params['append'])

        # make campaign
        new_campaign = json.loads(grouped.ix[campaign,'original_campaign']) 
        transform.modify_exisiting_campaign(new_campaign,LINE_ITEM)
        transform.build_campaign_name(new_campaign,new_profile,params)
        transform.set_campaign_budget(new_campaign,params)

        # set object to df
        grouped.ix[campaign,'profile'] = json.dumps(new_profile) 
        grouped.ix[campaign,'campaign'] = json.dumps(new_campaign)
        grouped.ix[campaign,'campaign_name'] = new_campaign['name'] 

    return grouped

def push_changes(grouped,ADVERTISER,params):
    assert len(params.items()) > 0
    assert len(grouped) > 0
    assert str(int(ADVERTISER)) == ADVERTISER

    if params['deactivate']:
        deactivate_campaigns(grouped.index,_c)
    elif params['modify']:
        update_profiles(grouped,ADVERTISER)
    else:
        # Remove duplicates by name
        campaigns = pandas.DataFrame(_c.get("/line-item?id=%s" % LINE_ITEM).json['response']['line-item']['campaigns'])
        if len(campaigns) > 0:
            new_grouped = grouped.merge(campaigns,left_on="campaign_name",right_on="name",how="left")
            new_grouped = new_grouped[new_grouped.state.isnull()]
        else:
            new_grouped = grouped

        push_campaigns(new_grouped,ADVERTISER,LINE_ITEM)

        if not params['duplicate']:
            deactivate_campaigns(grouped.index,_c)

    


def runner(params,data,_c):

    LINE_ITEM = params['line_item_id']
    ADVERTISER = params['advertiser']
    TEMPLATE_CAMPAIGN = params['template_campaign']
    GROUPBY = params["create_group"] if params["create_group"] and params["create_group"] != "" else "campaign_id"

    df = pandas.DataFrame(data)

    if len(df) == 0:
        return # skip building

    df['line_item'] = LINE_ITEM
    
    grouped = extract_and_group(df,GROUPBY,params,_c)
    grouped = build_objects(grouped,ADVERTISER,LINE_ITEM,params)
    push_changes(grouped,ADVERTISER,params)
