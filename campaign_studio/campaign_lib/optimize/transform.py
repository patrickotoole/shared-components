CAMPAIGN_FIELDS = [
    "daily_budget", 
    "daily_budget_imps", 
    "lifetime_budget", 
    "lifetime_budget_imps", 
    "base_bid", 
    "max_bid" 
]

FORMATTERS = {
    "segment_id": lambda x, action: { "id":x, "action": action },
    "placement_id": lambda x, action: { "id":x, "action": action },
    "venue_id": lambda x, action: x,
    "seller_id": lambda x, action: { "id": x, "action": action },
    "site_domain": lambda x, action: {"domain": x},
    "geo_dma": lambda x, action: {"dma":x[1], "name": x[0]}
}

FIELD_FORMATTERS = {
    "segment_id": lambda x: [{"boolean_operator": "or", "segments": x }],
    "placement_id": lambda x: x,
    "venue_id": lambda x: x,
    "seller_id": lambda x: x,
    "site_domain": lambda x: x,
    "geo_dma": lambda x: x
}

FIELD_NAMES = {
    "segment_id": "segment_group_targets",
    "placement_id": "platform_placement_targets",
    "venue_id": "venue_targets",
    "seller_id": "member_targets",
    "site_domain": "domain_targets",
    "geo_dma": "dma_targets",
}

FORMAT_EXTRA = {
    "venue_id": lambda x: {"venue_action": x, "member_targets":[], "platform_placement_targets":[]} if x == "include" else {"venue_action": x} ,
    "seller_id": lambda x: {"member_default_action": x },
    "placement_id": lambda x: {"member_targets":[]} if x == "include" else {} ,
    "site_domain": lambda x: {"domain_action": x },
    "geo_dma": lambda x: {"dma_action": x, "city_targets":[], "region_targets":[],"country_targets":[]} if x == "include" else {"dma_action": x}
}
   
def format(_type,values,action):
    formatted_values = [FORMATTERS[_type](i,action) for i in values] 
    formatted_field = FIELD_FORMATTERS[_type](formatted_values)
    additional_fields = FORMAT_EXTRA.get(_type, lambda x: {})(action)
     
    fields =  { FIELD_NAMES[_type] : formatted_field }

    return dict(fields.items() + additional_fields.items())

def build_profile_overrides(items,params):

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
            original_profile[k] = v + (original_profile[k] or [])
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
 
def build_campaign_name(new_campaign,final_profile,params):
    #new_campaign['name'] = original_campaign['name']
    if params.get('platform_placement_targets',False) == 'include':
        new_campaign['name'] += " - include platform_placement_targets: %s" % final_profile['platform_placement_targets'][0]['id']

    if params.get('venue_targets',False) == 'include':
        new_campaign['name'] += " - include venue: %s" % final_profile['venue_targets'][0]

    if params.get('domain_targets',False) == 'include':
        new_campaign['name'] += " - include domain: %s" % final_profile['domain_targets'][0]['domain']

    if params.get('dma_targets',False) == 'include':
        new_campaign['name'] += " - include dma: %s" % final_profile['dma_targets'][0]['name']

    return new_campaign

def set_campaign_budget(new_campaign,params):

    def check_and_set(field):
        val = params.get(field,'')

        if type(val) is str and not val.isdigit(): return

        if new_campaign[field] is not None:
            new_campaign[field] = float(params[field])

    items = CAMPAIGN_FIELDS

    [check_and_set(i) for i in items]
        


def set_campaign_budget_overrides(new_campaign,params):
    if params.get('imp_budget','').isdigit() and new_campaign['daily_budget_imps'] is not None:
        new_campaign['daily_budget_imps'] = int(params['imp_budget'])

    if params.get('spend_budget','').isdigit() and new_campaign['daily_budget'] is not None:
        new_campaign['daily_budget'] = int(params['spend_budget'])

