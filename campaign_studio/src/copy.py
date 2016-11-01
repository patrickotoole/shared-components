from extract import *
from transform import *
from load import *
from helper import *

import ujson

def load_json(s):
    try:
        return ujson.loads(s)
    except:
        return s



FORMATTERS = {
    "segment_id": lambda x, action: { "id":x, "action": action },
    "placement_id": lambda x, action: { "id":x, "action": action },
    "venue_id": lambda x, action: x,
    "seller_id": lambda x, action: { "id": x, "action": action },
    "site_domain": lambda x, action: {"domain": x}
}

FIELD_FORMATTERS = {
    "segment_id": lambda x: [{"boolean_operator": "or", "segments": x }],
    "placement_id": lambda x: x,
    "venue_id": lambda x: x,
    "seller_id": lambda x: x,
    "site_domain": lambda x: x
}

FIELD_NAMES = {
    "segment_id": "segment_group_targets",
    "placement_id": "platform_placement_targets",
    "venue_id": "venue_targets",
    "seller_id": "member_targets",
    "site_domain": "domain_targets"
}

FORMAT_EXTRA = {
    "venue_id": lambda x: {"venue_action": x, "member_targets":[], "platform_placement_targets":[]} if x == "include" else {"venue_action": x} ,
    "seller_id": lambda x: {"member_default_action": x },
    "placement_id": lambda x: {"member_targets":[]} if x == "include" else {} ,
    "site_domain": lambda x: {"domain_action": x }
}
   
def format(_type,values,action):
    formatted_values = [FORMATTERS[_type](i,action) for i in values] 
    formatted_field = FIELD_FORMATTERS[_type](formatted_values)
    additional_fields = FORMAT_EXTRA.get(_type, lambda x: {})(action)
     
    fields =  { FIELD_NAMES[_type] : formatted_field }

    return dict(fields.items() + additional_fields.items())

def build_new_profile(items,params):

    profile = [{}]

    for i, values in items:

        action = params.get(FIELD_NAMES.get(i,False),"none")
        if ("profile" not in i) and ("campaign" not in i) and action != "none":
            obj = format(i,values,action)
            profile = [dict(profile[0].items() + obj.items())]

    return profile[0]

def modify_exisiting_profile(original_profile,new_profile,advertiser,append=False):
    del original_profile['id']
    original_profile['advertiser_id'] = advertiser
    for k,v in new_profile.items():
        if append:
            original_profile[k] = v + original_profile[k]
            _set = {}
            _list = []
            for i in original_profile[k]:
                if not _set.get(str(i['id']),False):
                    _set[str(i['id'])] = True
                    _list = _list + [i]
            original_profile[k] = _list
        else:
            original_profile[k] = v

    return original_profile

def modify_exisiting_campaign(original_campaign,LINE_ITEM):
    
    del original_campaign['id']
    original_campaign['state'] = 'inactive'
    original_campaign['line_item_id'] = LINE_ITEM

    return original_campaign
    

def runner(params,LINE_ITEM,ADVERTISER,data,fields,_c):

    from link import lnk
    db = lnk.dbs.rockerbox

    CAP = 10

    NAMER = lambda x: "Rev: " + x.get("campaign_name","")
    filters = { "x": lambda row: True }

    import pandas

    df = pandas.DataFrame(data)
    df = filter(filters,df)
    df = df[df.isnull().T.sum() < 5]


    if len(df):
        
        df = get_mobile_targets(df,_c) 
        df = format_venue_targets(df) 

        df['max_day_imps'] = CAP
        df['max_lifetime_imps'] = CAP
        df['line_item'] = LINE_ITEM


        cols = ["campaign_id","placement_id","venue_id","segment_id","seller_id","site_domain","seller_member_name"]
        cols = [c for c in cols if c in df.columns]
        aggs = { k: lambda x: list(set(x)) for k in cols if k != "campaign_id" } 


        GROUPBY = "campaign_id"

        if params['create']:
            GROUPBY = params['create_group'] if params['create_group'] else GROUPBY

        if len(aggs) > 0:
            grouped = df[cols].groupby(GROUPBY).agg(aggs)
        else:
            grouped = df.set_index(GROUPBY)

        try:
            grouped = grouped.reset_index()
        except:
            pass

        if params['create']:
            template_campaign = pandas.DataFrame([{"campaign_id":params['template_campaign']}])
            template_df = get_campaigns_and_profiles(template_campaign,_c)


            campaign = template_df.ix[0,'original_campaign']
            profile = template_df.ix[0,'original_profile']
            grouped['original_campaign'] = campaign
            grouped['original_profile'] = profile

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
            
