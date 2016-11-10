from googleads import oauth2
from googleads import adwords
from oauth2client import client
import datetime
import httplib2
import ujson
import json
import logging
from link import lnk
import time
import uuid
import datetime
import StringIO
from RB import RB

client_id = '453433133828-9gvcn3vqs6gsb787sisb7vbl062lhggb.apps.googleusercontent.com'
client_secret = 'kklHsCFiRv06CDPFDe93lyEL'
redirect_uri = 'http://adwords.dev:8888/callback'
developer_token = 'l7GkOHpSh0XJoQZtZ5fRxg'

flow = client.OAuth2WebServerFlow(
    client_id = client_id,
    client_secret = client_secret,
    scope = oauth2.GetAPIScope('adwords'),
    user_agent = 'Rockerbox',
    redirect_uri = redirect_uri)
flow.params['access_type'] = 'offline'
flow.params['approval_prompt'] = 'force'

PAGE_SIZE = 10000

QUERY = "Select advertiser_id, token from advertiser_adwords"

class AdWords():
    def __init__(self,connectors):
        self.RB = RB()
        self.adwords_object = {}
        self.create_adwords_object(connectors['db'])

    def create_adwords_object(self,db):
        data = db.select_dataframe(QUERY)
        for item in data.iterrows():
            advertiser_id = item[1]['advertiser_id']
            creds = ujson.loads(item[1]['token'])
            expired = datetime.datetime.strptime(creds['token_expiry'],'%Y-%m-%dT%H:%M:%SZ')
            if datetime.datetime.now() > expired:
                adwords_client = {}
            else:
                adwords_client = self.adwordsClient(creds)
            self.adwords_object[advertiser_id] = {'expire': expired, 'client':adwords_client, 'token':creds}

    def adwordsClient(self, token):
        refresh_token = token['refresh_token']
        user_agent='Rockerbox'
        oauth2_client = oauth2.GoogleRefreshTokenClient(self.RB.client_id, self.RB.client_secret, refresh_token)
        adwords_client = adwords.AdWordsClient(self.RB.developer_token, oauth2_client, user_agent)
        customer_service = adwords_client.GetService('CustomerService', version='v201607')
        customers = customer_service.getCustomers()
        customer_id = customers[0].customerId
        adwords_client.SetClientCustomerId(customer_id)
        return adwords_client

    def get_adwords_client(self,advertiser_id):
        try:
            adwords_client = self.adwords_object.get(advertiser_id,{"client":{}}).get('client',{})
            expires = self.adwords_object.get(advertiser_id,{"expire":{}}).get('expire', datetime.datetime.now())
            if adwords_client == {} or datetime.datetime.now() > expires:
                self.adwords_object[advertiser_id]['client'] = self.adwordsClient(self.adwords_object[advertiser_id]['token'])
                self.adwords_object[advertiser_id]['expires'] = datetime.datetime.now() + datetime.timedelta(hours=1) 
            adwords_client = self.adwords_object[advertiser_id]['client']
        except:
            raise Exception("Error getting adwords client")
        return adwords_client

    def create_campaign(self, **kwargs):
        campaign = kwargs.get("arg",None)
        advertiser_id = kwargs.get("advertiser_id",None)
        print('Creating campaign (%s)...' % campaign['name'])
        budget_id = str(campaign['budget_id'])
        name = '%s #%s' % (campaign['name'], uuid.uuid4())
        impressions = str(campaign['impressions'])

        client = self.get_adwords_client(advertiser_id)
        campaign_service = client.GetService('CampaignService', version='v201607')

        operations = [{
            'operator': 'ADD',
            'operand': {
                'name': name,
                'status': 'PAUSED',
                'advertisingChannelType': 'DISPLAY',
                'biddingStrategyConfiguration': {
                    'biddingStrategyType': 'MANUAL_CPC',
                },
                'endDate': (datetime.datetime.now() +
                            datetime.timedelta(365)).strftime('%Y%m%d'),
              
                # Note that only the budgetId is required
                'budget': {
                    'budgetId': budget_id
                },
                'networkSetting': {
                    'targetGoogleSearch': 'false',
                    'targetSearchNetwork': 'false',
                    'targetContentNetwork': 'true',
                    'targetPartnerSearchNetwork': 'false'
                },
                # Optional fields
                'startDate': (datetime.datetime.now() +
                              datetime.timedelta(1)).strftime('%Y%m%d'),
                'adServingOptimizationStatus': 'ROTATE',
                'frequencyCap': {
                    'impressions': impressions,
                    'timeUnit': 'DAY',
                    'level': 'ADGROUP'
                },
                'settings': [{
                    'xsi_type': 'GeoTargetTypeSetting',
                    'positiveGeoTargetType': 'DONT_CARE',
                    'negativeGeoTargetType': 'DONT_CARE'
                }]
            }
        }]

        # Send payload to the AdWords server
        # try:
        campaigns = campaign_service.mutate(operations)

        response = {
            'success': True,
            'message': 'Campaign successfully created.',
            'id': campaigns['value'][0]['id']
        }
        # except:
        #     response = {
        #         'success': False,
        #         'message': 'Something went wrong while trying to create campaign.'
        #     }
        print('Finished creating campaign.')
        return response

    def read_campaign(self,advertiser_id):
        client = self.get_adwords_client(advertiser_id)
        campaign_service = client.GetService('CampaignService', version='v201607')

        selector = {
            'fields': ['Id', 'Name', 'Status'],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }

        # try:
        raw_data = campaign_service.get(selector)

        if 'entries' in raw_data:
            campaigns = []

            for campaign in raw_data['entries']:
                campaigns.append({
                    'id': campaign.id,
                    'name': campaign.name,
                    'status': campaign.status
                })

            response = {
                'success': True,
                'campaigns': campaigns
            }
        else:
            response = {
                'success': True,
                'campaigns': [],
                'message': 'No campaigns were found.'
            }
        # except:
        #     response = {
        #         'success': False,
        #         'message': 'Something went wrong when fetching campaigns.'
        #     }

        return response

    def update_campaign(self):
        return 'Update campaign'

    def delete_campaign(self):
        return 'Delete campaign'

    def create_adgroup(self, **kwargs):
        arg = kwargs.get('arg',None)
        advertiser_id = kwargs.get('advertiser_id',None)
        print('Creating ad group...')
        client = self.get_adwords_client(advertiser_id)
        ad_group_service = client.GetService('AdGroupService', version='v201607')

        operations = [{
            'operator': 'ADD',
            'operand': {
                'campaignId': arg['campaign_id'],
                'name': '%s #%s' % (arg['adgroup_name'], uuid.uuid4()),
                'status': 'ENABLED',
                'biddingStrategyConfiguration': {
                    'bids': [{
                        'xsi_type': 'CpcBid',
                        'bid': {
                            'microAmount': arg['bid_amount']
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
        # try:
        ad_groups = ad_group_service.mutate(operations)
        
        response = {
            'success': True,
            'id': ad_groups['value'][-1]['id']
        }
        # except:
        #     response = {
        #         'success': False,
        #         'message': 'Something went wrong while trying to create an ad group'
        #     }

        print('Finished creating ad group.')
        return response

    def read_adgroup(self, **kwargs):
        arg = kwargs.get('arg',None)
        advertiser_id = kwargs.get('advertiser_id')
        client = get_adwords_client(advertiser_id)
        ad_group_service = client.GetService('AdGroupService', version='v201607')

        campaign_id = str(arg['campaign_id'])

        selector = {
            'fields': ['Id', 'Name', 'Status'],
            'predicates': [{
                'field': 'CampaignId',
                'operator': 'EQUALS',
                'values': [campaign_id]
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }

        try:
            raw_data = ad_group_service.get(selector)
            adgroups = []

            if 'entries' in raw_data:
                for ad_group in raw_data['entries']:
                    adgroups.append({
                        'id': ad_group['id'],
                        'name': ad_group['name'],
                        'status': ad_group['status']
                    })
                response = {
                    'success': True,
                    'message': 'Ad groups successfully fetched.',
                    'adgroups': adgroups
                }
            else:
                response = {
                    'success': True,
                    'message': 'No ad groups were found.'
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while fetching ad groups.'
            }

        return response

    def update_adgroup(self):
        return 'Update adgroup'

    def delete_adgroup(self):
        return 'Delete adgroup'

    def get_ads(self, arg):
        ad_group_ad_service = self.adwords_client.GetService('AdGroupAdService', version='v201607')

        selector = {
        'fields': ['Id', 'AdGroupId', 'Status'],
        'predicates': [
            {
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [str(arg['adgroup_id'])]
            },{
                'field': 'AdType',
                'operator': 'EQUALS',
                'values': ['IMAGE_AD']
            }
        ],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }

        try:
            raw_data = ad_group_ad_service.get(selector)
            ads = []

            # Display results.
            if 'entries' in raw_data:
                for ad in raw_data['entries']:
                    ads.append(ad['ad'])

                response = {
                    'success': True,
                    'ads': ads
                }
            else:
                response = {
                    'success': True,
                    'message': 'No ads were found',
                    'ads': []
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to fetch '
            }

        return response

    def create_ad(self, arg):
        arg = kwargs.get('arg',None)
        advertiser_id = kwargs.get('advertiser_id',None)
        client = self.get_adwords_client(advertiser_id)
        ad_group_ad_service = client.GetService('AdGroupAdService', version='v201607')

        # 'exemptionRequests': [{
        #     # This comes back in a PolicyViolationError.
        #     'key' {
        #         'policyName': '...',
        #         'violatingText': '...'
        #     }
        # }]

        if(arg['type'] == 'DISPLAY'):
            # media_input = {
            #     'id': 2185952819
            # }
            # media = self.adwords.get_media(media_input)
            # media[0]





            media_service = self.adwords_client.GetService('MediaService', version='v201607')

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

            raw_data = media_service.get(selector)

            media = raw_data[0]





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
        else:
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
        
        # try:
        ad = ad_group_ad_service.mutate(operations)
        response = {
            'success': True,
            'message': 'Successfully created a text ad.',
            'id': ad['value'][-1]['ad']['id']
        }
        # except:
        #     response = {
        #         'success': False,
        #         'message': 'Something went wrong while trying to create an ad.'
        #     }
        print('Finished creating ad...')
        return response

    def read_ad(self):
        return 'List of ads'

    def update_ad(self):
        return 'Update ad'

    def delete_ad(self):
        return 'Delete ad'

    def get_media(self, media_input):
        media_service = self.adwords_client.GetService('MediaService', version='v201607')

        selector = {
            'fields': ['MediaId', 'Type', 'ReferenceId', 'Dimensions', 'Urls', 'MimeType', 'SourceUrl', 'Name', 'FileSize', 'CreationTime'],
            'predicates': [{
                'field': 'MediaId',
                'operator': 'EQUALS',
                'values': [media_input['id']]
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(200)
            }
        }

        raw_data = media_service.get(selector)

        return raw_data
        

    def create_media(self, image_data):
        media_service = self.adwords_client.GetService('MediaService', version='v201607')
        
        media = [{
            'xsi_type': 'Image',
            'data': image_data,
            'type': 'IMAGE'
        }]

        media = media_service.upload(media)[0]

        if media:
            dimensions = dict([(entry['key'], entry['value']) for entry in media['dimensions']])
            response = {
                'success': True,
                'message': 'Image was successfully uploaded.',
                'id': media['mediaId'],
                'width': dimensions['FULL']['width'],
                'height': dimensions['FULL']['height'],
                'mimetype': media['mimeType']
            }
        else:
            response = {
                'success': False,
                'message': 'Image was not uploaded.'
            }
        
        return response

    def set_schedule(self, **kwargs):
        arg = kwargs.get('schedule',None)
        advertiser_id = kwargs.get('advertiser_id',None)

        client = self.get_adwords_client(advertiser_id)
        ad_group_criterion_service = client.GetService('CampaignCriterionService', version='v201607')

        operations = []

        for item in arg['mediaplan']:
            if(item['parent_category_name'] == arg['category']):
                # Get start hour
                start_hour = item['hour']

                # Get end hour
                if(start_hour == '23'):
                    end_hour = '00'
                else:
                    end_hour = int(start_hour) + 1

                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'MONDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'TUESDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'WEDNESDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'THURSDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'FRIDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'SATURDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
                operations.append({
                    'operator': 'ADD',
                    'operand': {
                        'campaignId': arg['campaign_id'],
                        'criterion': {
                            'xsi_type': 'AdSchedule',
                            'dayOfWeek': 'SUNDAY',
                            'startHour': start_hour,
                            'startMinute': 'ZERO',
                            'endHour': end_hour,
                            'endMinute': 'ZERO'
                        }
                    }
                })
        
        try:
            ad_group_criteria = ad_group_criterion_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Successfully added schedule criterea to campaign.',
                'id': ad_group_criteria['value'][0]['criterion']['id']
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add schedule criterea to campaign.'
            }

        print('Finished setting schedule.')
        return response

    def read_schedule(self, **kwargs):
        campaign_id = kwargs.get('campaign_id', None)
        advertiser_id = kwargs.get('advertiser_id',None)
        client = self.get_adwords_client(advertiser_id)
        ad_group_criterion_service = client.GetService('CampaignCriterionService', version='v201607')

        # 'fields': ['DayOfWeek', 'StartHour', 'StartMinute', 'EndHour', 'EndMinute'],
        selector = {
            'fields': ['DayOfWeek'],
            'predicates': [{
                'field': 'CampaignId',
                'operator': 'EQUALS',
                'values': [campaign_id]
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
        
        try:
            raw_data = ad_group_criterion_service.get(selector)

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

                response = {
                    'success': True,
                    'schedule': schedule
                }
            else:
                response = {
                    'success': True,
                    'message': 'No schedules were found.',
                    'schedule': []
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to get schedule.'
            }

        return response


    def create_keyword(self):
        return 'Create keyword'

    def read_keyword(self):
        return 'List of keywords'

    def set_placement(self, **kwargs):
        arg = kwargs.get('arg',None)
        advertiser_id = kwargs.get('advertiser_id',None)
        adgroup_id = str(arg['adgroup_id'])
        
        client = self.get_adwords_client(advertiser_id)
        ad_group_criterion_service = client.GetService('AdGroupCriterionService', version='v201607')
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
        
        try:
            ad_group_criteria = ad_group_criterion_service.mutate(operations)

            resp = json.dumps(ad_group_criteria)
            print(resp)
            list_of_ids = []
            for item in resp['value']:
                print(item)
                ad_group_criteria_id = item["criterion"]["id"]
                list_of_ids.append(ad_group_criteria_id)

            response = {
                'success': True,
                'message': 'Successfully added placement criterea to ad group.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add placement criterea to ad group.'
            }
        print('Finished setting placement.')
        return response

    def read_placement(self):
        return 'List of placements'

    
    def create_vertical(self):
        return 'Create vertical'

    def read_vertical(self):
        return 'List of verticals'


    def get_customer(self,advertiser_id):
        client = self.get_adwords_client(advertiser_id)
        customer_service = client.GetService('CustomerService', version='v201607')
        customers = customer_service.getCustomers()

        return customers


    def create_manage(self, arg):
        print 'HIT!!!!'
        return 'create campaigns'

    def create_manage_alt(self, arg):
        return 'test'


    def create_account(self, **kwargs):
        arg = kwargs.get('arg',None)
        advertiser_id = kwargs.get('advertiser_id',None)
        client = self.get_adwords_client(advertiser_id)
        managed_customer_service = client.GetService('ManagedCustomerService', version='v201607')

        today = datetime.datetime.today().strftime('%Y%m%d %H:%M:%S')
        operations = [{
            'operator': 'ADD',
            'operand': {
                'name': arg['name'],
                'currencyCode': arg['currency'],
                'dateTimeZone': arg['timezone'],
            }
        }]

        accounts = managed_customer_service.mutate(operations)

        return accounts

    def get_account(self, advertiser_id):
        # Initialize appropriate service.
        client = self.get_adwords_client(advertiser_id)
        managed_customer_service = client.GetService('ManagedCustomerService', version='v201607')

        # Construct selector to get all accounts.
        selector = {
            'fields': ['CustomerId', 'Name'],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }

        try:
            raw_data = managed_customer_service.get(selector)

            accounts = []

            for account in raw_data['entries']:
                accounts.append({
                    'id': account['customerId'],
                    'name': account['name']
                })

            response = {
                'success': True,
                'accounts': accounts
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong when trying to fetch accounts.'
            }

        return response


    def create_budget(self, **kwargs):
        arg = kwargs.get("budget_input",None)
        advertiser_id = kwargs.get("advertiser_id",None)
        client = self.get_adwords_client(advertiser_id)
        budget_service = client.GetService('BudgetService', version='v201607')

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

        try:
            budget_id = budget_service.mutate(budget_operations)['value'][0]['budgetId']
            response = {
                'success': True,
                'budget_id': budget_id
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add budget.'
            }

        return response

    def read_budget(self,advertiser_id):
        client = self.get_adwords_client(advertiser_id)
        budget_service = client.GetService('BudgetService', version='v201607')

        selector = {
            'fields': ['BudgetId', 'BudgetName', 'BudgetReferenceCount', 'BudgetStatus', 'DeliveryMethod'],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            }
        }

        try:
            raw_data = budget_service.get(selector)

            budgets = []

            if hasattr(raw_data, 'entries'):
                for budget in raw_data['entries']:
                    budgets.append({
                        'budget_id': budget['budgetId'],
                        'budget_name': budget['name'],
                        'budget_reference_count': budget['referenceCount'],
                        'budget_status': budget['status'],
                        'delivery_method': budget['deliveryMethod']
                    })
                response = {
                    'success': True,
                    'budgets': budgets
                }
            else:
                response = {
                    'success': True,
                    'message': 'No budgets could be found.',
                    'budgets': budgets
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong when trying to fetch budgets.'
            }

        return response


