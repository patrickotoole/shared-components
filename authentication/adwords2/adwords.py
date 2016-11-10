from googleads import oauth2
from googleads import adwords
from oauth2client import client
import httplib2
import json
import logging
from link import lnk
import time
import uuid
import datetime
import StringIO

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

class AdWords_Campaign():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self, campaign):
        print('Creating campaign (%s)...' % campaign['name'])
        budget_id = str(campaign['budget_id'])
        name = '%s #%s' % (campaign['name'], uuid.uuid4())
        impressions = str(campaign['impressions'])

        campaign_service = self.adwords_client.GetService('CampaignService', version='v201607')

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

    def read(self):
        campaign_service = self.adwords_client.GetService('CampaignService', version='v201607')

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

    def update(self):
        return 'Update campaign'

    def delete(self):
        return 'Delete campaign'


class AdWords_AdGroup():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self, arg):
        print('Creating ad group...')
        ad_group_service = self.adwords_client.GetService('AdGroupService', version='v201607')

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

    def read(self, arg):
        ad_group_service = self.adwords_client.GetService('AdGroupService', version='v201607')

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

    def update(self):
        return 'Update adgroup'

    def delete(self):
        return 'Delete adgroup'


class AdWords_Ad():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self, arg):
        print('Creating ad...')
        ad_group_ad_service = self.adwords_client.GetService('AdGroupAdService', version='v201607')

        # 'exemptionRequests': [{
        #     # This comes back in a PolicyViolationError.
        #     'key' {
        #         'policyName': '...',
        #         'violatingText': '...'
        #     }
        # }]

        final_url = arg['final_url']
        display_url = arg['display_url']
        description1 = arg['description1']
        description2 = arg['description2']
        headline = arg['headline']

        operations = [{
            'operator': 'ADD',
            'operand': {
                'xsi_type': 'AdGroupAd',
                'adGroupId': arg['adgroup_id'],
                'ad': {
                    'xsi_type': 'TextAd',
                    'finalUrls': [final_url],
                    'displayUrl': display_url,
                    'description1': description1,
                    'description2': description2,
                    'headline': headline
                },
                # Optional fields.
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

    def read(self):
        return 'List of ads'

    def update(self):
        return 'Update ad'

    def delete(self):
        return 'Delete ad'



class AdWords_Schedule():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def set(self, arg):
        print('Setting schedule...')
        ad_group_criterion_service = self.adwords_client.GetService('CampaignCriterionService', version='v201607')

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

    def read(self, campaign_id):
        ad_group_criterion_service = self.adwords_client.GetService('CampaignCriterionService', version='v201607')

        campaign_id = str(campaign_id)

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


class AdWords_Keyword():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self):
        return 'Create keyword'

    def read(self):
        return 'List of keywords'


class AdWords_Placement():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def set(self, arg):
        print('Setting placements...')
        adgroup_id = str(arg['adgroup_id'])

        ad_group_criterion_service = self.adwords_client.GetService('AdGroupCriterionService', version='v201607')
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

    def read(self):
        return 'List of placements'


class AdWords_Vertical():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self):
        return 'Create vertical'

    def read(self):
        return 'List of verticals'


class AdWords_Customer():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def get(self):
        customer_service = self.adwords_client.GetService('CustomerService', version='v201607')
        customers = customer_service.getCustomers()

        return customers



class AdWords_Manage():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self, arg):
        print 'HIT!!!!'
        return 'create campaigns'

    def create2(self, arg):
        return 'test'


class AdWords_Account():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self, arg):
        managed_customer_service = self.adwords_client.GetService('ManagedCustomerService', version='v201607')

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

    def get(self):
        # Initialize appropriate service.
        managed_customer_service = self.adwords_client.GetService('ManagedCustomerService', version='v201607')

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


class AdWords_Budget():
    def __init__(self, adwords_client):
        self.adwords_client = adwords_client

    def create(self, arg):
        budget_service = self.adwords_client.GetService('BudgetService', version='v201607')

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

    def read(self):
        budget_service = self.adwords_client.GetService('BudgetService', version='v201607')

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



class AdWords():
    def __init__(self):
        self.adwords_client = self.getAdWordsClient()
        self.adwords_client_manager = self.getAdWordsClient(manager=True)

        self.Campaign = AdWords_Campaign(self.adwords_client)
        self.AdGroup = AdWords_AdGroup(self.adwords_client)
        self.Ad = AdWords_Ad(self.adwords_client)
        self.Schedule = AdWords_Schedule(self.adwords_client)
        self.Keyword = AdWords_Keyword(self.adwords_client)
        self.Placement = AdWords_Placement(self.adwords_client)
        self.Vertical = AdWords_Vertical(self.adwords_client)
        self.Customer = AdWords_Customer(self.adwords_client)
        self.Account = AdWords_Account(self.adwords_client_manager)
        self.Budget = AdWords_Budget(self.adwords_client)
        self.Manage = AdWords_Manage(self.adwords_client)

    def getAdWordsClient(self, manager=False):
        credentials = {"_module": "oauth2client.client", "scopes": ["https://www.googleapis.com/auth/adwords"], "token_expiry": "2016-10-25T17:59:29Z", "id_token": None, "access_token": "ya29.Ci-HA-qvW2rGkZ6M_YQNqda9woKX_HYbo9hSg9BATnfFqeuFu_5hdT4ZPIgbosmcvw", "token_uri": "https://accounts.google.com/o/oauth2/token", "invalid": False, "token_response": {"access_token": "ya29.Ci-HA-qvW2rGkZ6M_YQNqda9woKX_HYbo9hSg9BATnfFqeuFu_5hdT4ZPIgbosmcvw", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "1/Hd42fqVniTtLC25wyVpyOsgUTjKpF5gzNPqE6yJDnCYC_2_yhNyxjsA6Pztz3tY4"}, "client_id": "453433133828-9gvcn3vqs6gsb787sisb7vbl062lhggb.apps.googleusercontent.com", "token_info_uri": "https://www.googleapis.com/oauth2/v2/tokeninfo", "client_secret": "kklHsCFiRv06CDPFDe93lyEL", "revoke_uri": "https://accounts.google.com/o/oauth2/revoke", "_class": "OAuth2Credentials", "refresh_token": "1/Hd42fqVniTtLC25wyVpyOsgUTjKpF5gzNPqE6yJDnCYC_2_yhNyxjsA6Pztz3tY4", "user_agent": "Rockerbox"}
        refresh_token = credentials['refresh_token']
        user_agent = 'Rockerbox'
        client_customer_id = None

        oauth2_client = oauth2.GoogleRefreshTokenClient(client_id, client_secret, refresh_token)
        adwords_client = adwords.AdWordsClient(developer_token, oauth2_client, user_agent)
        
        # Get customer_id
        customer_service = adwords_client.GetService('CustomerService', version='v201607')
        customers = customer_service.getCustomers()

        # Set customer_id
        if manager:
            customer_id = customers[0].customerId
        else:
            # customer_id = 4615949654
            customer_id = 2249179047

        adwords_client.SetClientCustomerId(customer_id)

        return adwords_client
