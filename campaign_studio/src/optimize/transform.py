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
 
