import ujson

PAGE_SIZE = 10000

SETCAMPAIGN = [{
            'operator':'SET',
            'operand': {
                'biddingStrategyConfiguration': {
                    'biddingStrategyType': 'MANUAL_CPC',
                },
                'id': "", #campaignid,
                #'startDate': "" 
                #'endDate': ""
                'budget': {
                            'budgetId': ''
                },
                'settings': [{
                    'xsi_type': 'GeoTargetTypeSetting',
                    'positiveGeoTargetType': 'DONT_CARE',
                    'negativeGeoTargetType': 'DONT_CARE'
                }]
            } 
    }]

CREATECAMPAIGN = [{
            'operator': 'ADD',
            'operand': {
                'name': "", #name,
                'advertisingChannelType': 'DISPLAY',
                'biddingStrategyConfiguration': {
                    'biddingStrategyType': 'MANUAL_CPM',
                },
                'endDate': #(datetime.datetime.now() +
                            #datetime.timedelta(365)).strftime('%Y%m%d'),
                            "",

                # Optional fields
                'startDate': #(datetime.datetime.now() +
                             # datetime.timedelta(1)).strftime('%Y%m%d'),
                            "",
                'budget': {'name':'testbudgetname',
                            'budgetId': ''
                },
                'settings': [{
                    'xsi_type': 'GeoTargetTypeSetting',
                    'positiveGeoTargetType': 'DONT_CARE',
                    'negativeGeoTargetType': 'DONT_CARE'
                }]
            }
        }]

SELECTOR = {
            'fields': ['Id', 'Name', 'Status'],
            'paging': {
                'startIndex': str(0),
                'numberResults':  "" #str(PAGE_SIZE)
            }
        }


ADGROUP =[{
            'operator': 'ADD',
            'operand': {
                'campaignId': "", #arg['campaign_id'],
                'name': "", #%s #%s' % (arg['adgroup_name'], uuid.uuid4()),
                'status': 'ENABLED',
                'biddingStrategyConfiguration': {
                    'bids': [{
                        'xsi_type': 'CpcBid',
                        'bid': {
                            'microAmount': "" #arg['bid_amount']
                        },
                    }]
                },
                'settings': [{
                    # Targeting restriction settings. Depending on the
                    # criterionTypeGroup value, most TargetingSettingDetail only
                    # affect Display campaigns. However, the
                    # USER_INTEREST_AND_LIST value works for RLSA campaigns -
                    # Search campaigns targeting using a remarketing list.
                    'xsi_type': 'TargetingSetting',
                    'details': [
                        # Restricting to serve ads that match your ad group
                        # placements. This is equivalent to choosing
                        # "Target and bid" in the UI.
                        {
                            'xsi_type': 'TargetingSettingDetail',
                            'criterionTypeGroup': 'PLACEMENT',
                            'targetAll': 'false',
                        },
                        # Using your ad group verticals only for bidding. This is
                        # equivalent to choosing "Bid only" in the UI.
                        {
                            'xsi_type': 'TargetingSettingDetail',
                            'criterionTypeGroup': 'VERTICAL',
                            'targetAll': 'true',
                        },
                    ]
                }]
            }
        }]


def create_campaign(name, start, end, budgetid):
    camp_obj = CREATECAMPAIGN
    camp_obj[0]['operand']['name'] = name
    camp_obj[0]['operand']['startDate'] = start
    camp_obj[0]['operand']['endDate'] = end
    camp_obj[0]['operand']['budget']['budgetId'] = budgetid
    #971848957
    return camp_obj

def get_selector(fields):
    if not fields:
        fields = ['Id', 'Name', 'Status']
    selec = SELECTOR
    selec['fields'] = fields
    selec['paging']['numberResults'] = str(PAGE_SIZE) 
    return selec

def process_campaigns(raw_data):
    campaigns = []

    for campaign in raw_data['entries']:
        campaigns.append({
            'id': campaign.id,
            'name': campaign.name,
            'status': campaign.status
        })

    return campaigns


def create_adgroup(a,b,c):

    adgroups = ADGROUP
    adgroups[0]['operand']['campaignId'] = a
    adgroups[0]['operand']['name'] = b
    adgroups[0]['operand']['biddingStrategyConfiguration']['bids'][0]['bid']['microAmount'] = c

    return adgroups

#adgroup
def get_adgroup_selector(camp_id):
    selector = {
        'fields': ['Id', 'Name', 'Status'],
        'predicates': [{
                'field': 'CampaignId',
                'operator': 'EQUALS',
                'values': [camp_id]
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }
    return selector

def process_adgroup(adgroup):
    adgroups= []
    for ad_group in raw_data['entries']:
        adgroups.append({
            'id': ad_group['id'],
            'name': ad_group['name'],
            'status': ad_group['status']
        })
    return adgroups


def get_ads_selector(ad_id):
    selector = {
        'fields': ['Id', 'AdGroupId', 'Status'],
        'predicates': [
            {
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [ad_id]
            },
            #{
            #    'field': 'AdType',
            #    'operator': 'EQUALS',
            #    'values': ['IMAGE_AD']
            #}
        ],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }
    return selector

def create_ad_selector():
    selector = {
        'fields': ['MediaId', 'Type', 'ReferenceId', 'Dimensions', 'Urls', 'MimeType', 'SourceUrl', 'Name', 'FileSize', 'CreationTime'],
        'predicates': [{
            'field': 'MediaId',
            'operator': 'EQUALS',
            'values': [2185952819]
            }],
        'paging': {
                    'startIndex': str(0),
                    'numberResults': str(200)
                }
            }
    return ""

def create_ad_object(arg,media):
    operations = [{
                'operator': 'ADD',
                'operand': {
                    'xsi_type': 'AdGroupAd',
                    'adGroupId': arg['adgroup_id'],
                    'ad': {
                        'xsi_type': 'ImageAd',
                        'finalUrls': [arg['final_url']],
                        'displayUrl': arg['display_url'],
                        'type': 'image',
                        'image': media,
                        'name': 'test name'
                    },
                    # Optional fields.
                    'status': 'ENABLED'
                }
            }]
    return operations

def create_ad_object_alt(arg):
    operations = [{
                'operator': 'ADD',
                'operand': {
                    'xsi_type': 'AdGroupAd',
                    'adGroupId': arg['adgroup_id'],
                    'ad': {
                        'xsi_type': 'TextAd',
                        'finalUrls': [arg['final_url']],
                        'displayUrl': arg['display_url'],
                        'description1': arg['description1'],
                        'description2': arg['description2'],
                        'headline': arg['headline']
                    },
                    'status': 'ENABLED'
                }
            }]
    return operations

def add_operation_schedule(day,start_hour, end_hour, camp_id):
    operation = {
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': camp_id,
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': day,
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                }
    return operation

def get_media_selector(media_id):

    selector = {
            'fields': ['MediaId', 'Type', 'ReferenceId', 'Dimensions', 'Urls', 'MimeType', 'SourceUrl', 'Name', 'FileSize', 'CreationTime'],
            'predicates': [{
                'field': 'MediaId',
                'operator': 'EQUALS',
                'values': [media_id]
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(200)
            }
        }
    return selector

def get_schedule_selector(camp_id):
    selector = {
            'fields': ['DayOfWeek'],
            'predicates': [{
                'field': 'CampaignId',
                'operator': 'EQUALS',
                'values': [camp_id]
            },{
                'field': 'CriteriaType',
                'operator': 'EQUALS',
                'values': ['AD_SCHEDULE']
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            },
            'ordering': [{'field': 'DayOfWeek', 'sortOrder': 'ASCENDING'}]
        }
    return selector

def process_placement(arg,adgroup_id):
    operations = []

    for placement in arg['mediaplan']:
        if(arg['category'] == placement['parent_category_name']):
            placement_input = {
                'xsi_type': 'BiddableAdGroupCriterion',
                'adGroupId': adgroup_id,
                'criterion': {
                    'xsi_type': 'Placement',
                    'url': 'http://%s' % placement['domain']
                }
            }
            operations.append({
                'operator': 'ADD',
                'operand': placement_input
            })
    return operations


def process_schedule(raw_data):
    schedule = []
    # self.write(json.dumps(raw_data))

    # Display results.
    if 'entries' in raw_data:
        for schedule_item in raw_data['entries']:
            schedule.append({
                'id': schedule_item['criterion']['id'],
                'type': schedule_item['criterion']['type'],
                'dayOfWeek': schedule_item['criterion']['dayOfWeek'],
                'startHour': schedule_item['criterion']['startHour'],
                'startMinute': schedule_item['criterion']['startMinute'],
                'endHour': schedule_item['criterion']['endHour'],
                'endMinute': schedule_item['criterion']['endMinute']
            })

    return schedule

def account_object(arg):
    operations = [{
        'operator': 'ADD',
        'operand': {
            'name': arg['name'],
            'currencyCode': arg['currency'],
            'dateTimeZone': arg['timezone'],
        }
    }]
    return operations

def get_account_selector():
    selector = {
            'fields': ['CustomerId', 'Name'],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }
    return selector

def get_budget_object(arg):
    budget = {
        'name': arg['name'],
        'amount': {
            'microAmount': arg['amount']
        },
        'deliveryMethod': 'STANDARD'
    }

    budget_operations = [{
        'operator': 'ADD',
        'operand': budget
    }]
    return budget_operations

def budget_selector():
    selector = {
        'fields': ['BudgetId', 'BudgetName', 'BudgetReferenceCount', 'BudgetStatus', 'DeliveryMethod'],
        'paging': {
            'startIndex': str(0),
            'numberResults': str(PAGE_SIZE)
        }
    }
    return selector

def get_read_budget(raw_data):
    budgets =[]
    for budget in raw_data['entries']:
        budgets.append({
            'budget_id': budget['budgetId'],
            'budget_name': budget['name'],
            'budget_reference_count': budget['referenceCount'],
            'budget_status': budget['status'],
            'delivery_method': budget['deliveryMethod']
        })
    return budgets
