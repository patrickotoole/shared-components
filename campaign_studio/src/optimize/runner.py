import pandas

#from extract import *
from transform import *
from ..create.load import push_campaigns, update_profiles
from helper import *

SUPPORTED_COLS = ["campaign_id","placement_id","venue_id","segment_id","seller_id","site_domain","seller_member_name"]
AGG_TO_GROUP = lambda x: list(set(x))

def build_agg_funcs(df,groupby):
    cols = [c for c in SUPPORTED_COLS if c in df.columns]
    aggs = { k: lambda x: list(set(x)) for k in cols if k != groupby }

    return aggs

def run_agg(df,groupby,aggs):
    df = df[SUPPORTED_COLS].set_index(groupby)

    if len(aggs) > 0:
        grouped = df.reset_index().groupby(groupby).agg(aggs)

    grouped = grouped.reset_index()
    return grouped

def get_campaigns_and_profiles_from_template(template,grouped,_c):
    template_campaign = pandas.DataFrame([{"campaign_id": template}])
    template_df = get_campaigns_and_profiles(template_campaign,_c)


    campaign = template_df.ix[0,'original_campaign']
    profile = template_df.ix[0,'original_profile']
    grouped['original_campaign'] = campaign
    grouped['original_profile'] = profile

    return grouped


    

def runner(params,data,_c):

    LINE_ITEM = params['line_item_id']
    ADVERTISER = params['advertiser']
    TEMPLATE_CAMPAIGN = params['template_campaign']
    GROUPBY = params.get("create_group","campaign_id")

    df = pandas.DataFrame(data)
    df = df[df.isnull().T.sum() < 5]

    if len(df) == 0:
        return # skip building

    df['line_item'] = LINE_ITEM
    df = get_mobile_targets(df,_c) 
    df = format_venue_targets(df) 


    aggs = build_agg_funcs(df,GROUPBY)
    grouped = run_agg(df,GROUPBY,aggs)

    
    if params['create']:
        grouped = get_campaigns_and_profiles_from_template(template,grouped,_c)
    else:
        grouped = get_campaigns_and_profiles(grouped,_c)

    grouped = grouped.set_index(GROUPBY)
    grouped = grouped[grouped.original_campaign != ""]


    if params['breakout']:
        grouped = df.merge(grouped.reset_index(),left_on="campaign_id",right_on="campaign_id",suffixes=("","_r"))
        for c in cols:
            grouped[c] = grouped[c].map(lambda x: [x])



    import json

    if params['create']:
        grouped = grouped.reset_index()

    for campaign, row in grouped.iterrows():

        items = row.to_dict().items()
        new_profile = build_new_profile(items,params)
        original_profile = json.loads(grouped.ix[campaign,'original_profile'])
        final_profile = modify_exisiting_profile(original_profile,new_profile,ADVERTISER,params['append'])
        grouped.ix[campaign,'profile'] = json.dumps(final_profile) 

        original_campaign = json.loads(grouped.ix[campaign,'original_campaign']) 
        new_campaign = modify_exisiting_campaign(original_campaign,LINE_ITEM)
        new_campaign['name'] = original_campaign['name']



        if params.get('platform_placement_targets',False) == 'include':
            new_campaign['name'] += " - include platform_placement_targets: %s" % final_profile['platform_placement_targets'][0]['id']

        if params.get('venue_targets',False) == 'include':
            new_campaign['name'] += " - include venue: %s" % final_profile['venue_targets'][0]

        if params.get('domain_targets',False) == 'include':
            new_campaign['name'] += " - include domain: %s" % final_profile['domain_targets'][0]['domain']

        if params.get('imp_budget','').isdigit() and new_campaign['daily_budget_imps'] is not None:
            new_campaign['daily_budget_imps'] = int(params['imp_budget'])

        if params.get('spend_budget','').isdigit() and new_campaign['daily_budget'] is not None:
            new_campaign['daily_budget'] = int(params['spend_budget'])

        #new_campaign['name'] += " - exclude: " + str(len(final_profile['platform_placement_targets'])) + " placements" 

        #new_campaign['name'] += " - include placement: %s" % final_profile['platform_placement_targets'][0]
        
        #new_campaign['name'] = 'Nat Geo - Desktop - Seller: ' + row.to_dict()['seller_member_name'][0]
        print new_campaign['name']


        grouped.ix[campaign,'campaign'] = json.dumps(new_campaign)
        grouped.ix[campaign,'campaign_name'] = new_campaign['name'] 

    print grouped['profile'].iloc[0]

    

    if params['modify']:
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
        
