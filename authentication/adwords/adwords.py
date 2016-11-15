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
from auth import AdWordsAuth
import adwords_helper as adwords_helper

PAGE_SIZE = 10000

QUERY = "Select advertiser_id, token from advertiser_adwords"

class AdWords(AdWordsAuth):

    def create_campaign(self, **kwargs):
        campaign = kwargs.get("arg",None)
        advertiser_id = kwargs.get("advertiser_id",None)
        print('Creating campaign (%s)...' % campaign['name'])
        name = '%s #%s' % (campaign['name'], uuid.uuid4())
        budget_id = campaign['budget_id']

        client = self.get_adwords_client(advertiser_id)
        campaign_service = client.GetService('CampaignService', version='v201607')

        timestamp = (datetime.datetime.now()+datetime.timedelta(365)).strftime('%Y%m%d')
        
        campaign_obj = adwords_helper.create_campaign(name, timestamp,timestamp, budget_id) 

        logging.info(campaign_obj)

        # Send payload to the AdWords server
        # try:
        campaigns = campaign_service.mutate(campaign_obj)

        response = {
            'success': True,
            'message': 'Campaign successfully created.',
            'id': campaigns['value'][0]['id']
        }
        print('Finished creating campaign.')
        return response

    def read_campaign(self,advertiser_id):
        client = self.get_adwords_client(advertiser_id)
        campaign_service = client.GetService('CampaignService', version='v201607')

        selector = adwords_helper.get_selector()
        # try:
        raw_data = campaign_service.get(selector)

        if 'entries' in raw_data:
            response = adwords_helper.process_campaigns(raw_data)
        else:    
            response = {
                'success': False,
                'message': 'Something went wrong when fetching campaigns.'
            }
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

        operations = adwords_helper.create_adgroup(arg['campaign_id'],'%s #%s' % (arg['adgroup_name'], uuid.uuid4()), arg['bid_amount'])

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

        return response

    def read_adgroup(self, campaign_id, advertiser_id):

        client = self.get_adwords_client(int(advertiser_id))
        ad_group_service = client.GetService('AdGroupService', version='v201607')
        
        try:
            selector = adwords_helper.get_adgroup_selector(campaign_id)
            raw_data = ad_group_service.get(selector)

            if 'entries' in raw_data:
 
                response = {
                    'success': True,
                    'message': 'Ad groups successfully fetched.',
                    'adgroups': ujson.dumps(raw_data)
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

    def get_ads(self, advertiser_id, adgroup_id):
        client = self.get_adwords_client(int(advertiser_id))
        ad_group_ad_service = client.GetService('AdGroupAdService', version='v201607')


        selector = adwords_helper.get_ads_selector(str(adgroup_id))

        try:
            raw_data = ad_group_ad_service.get(selector)
            ads = []
            # Display results.
            if 'entries' in raw_data:
                #for ad in raw_data['entries']:
                #    ads.append(ad['ad'])

                response = {
                    'success': True,
                    'ads': ujson.dumps(raw_data)
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

    def create_ad(self, advertiser_id, ad_type, media_id, name, ad_group_id):
        client = self.get_adwords_client(advertiser_id)
        ad_group_ad_service = client.GetService('AdGroupAdService', version='v201607')


        #media_service = self.adwords_client.GetService('MediaService', version='v201607')
        #selector = adwords_helper.create_ad_selector()
        #raw_data = media_service.get(selector)
        #media = raw_data[0]
        #operations = adwords_helper.create_ad_object(arg,media)
        
        operations = [{
        'operator': 'ADD',
        'operand': {
            'xsi_type': 'AdGroupAd',
            'adGroupId': ad_group_id,
            'ad': {
                #'xsi_type': 'ExpandedTextAd',
                #'headlinePart1': ('Cruise #%s to Mars'),
                #'headlinePart2': 'Best Space Cruise Line',
                #'description': 'Buy your tickets now!',
                'displayUrl': 'http://rockerbox.com/assets/img/general/logo-white.png',
                'finalUrls': ['http://www.rockerbox.com/'],
                'xsi_type': 'ImageAd',
                'name':'sampletest',
                'image': {
                    'mediaId':2212157213,
                    'dimensions': [{'key':'FULL','value':{'height':250,'width':300}}],
                    'urls':[{ 'key': "FULL", 'value':"https://tpc.googlesyndication.com/simgad/16772800598182678158"}],
                    },
                
            },
            # Optional fields.
            'status': 'PAUSED'
        }
        }] 
         
        # try:
        import ipdb; ipdb.set_trace()
        ad = ad_group_ad_service.mutate(operations)
        #response = {
        #    'success': True,
        #    'message': 'Successfully created a text ad.',
        #    'id': ad
        #}
        response = ad
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

    def get_media(self, advertiser_id, media_input):
        client = self.get_adwords_client(int(advertiser_id))
        media_service = client.GetService('MediaService', version='v201607')

        selector = adwords_helper.get_media_selector(media_input)
        raw_data = media_service.get(selector)

        return raw_data
        

    #def create_media(self, image_url, name, advertiser_id, image_data):
    def create_media(self,advertiser_id, image_data):
        client = self.get_adwords_client(advertiser_id)
        media_service = client.GetService('MediaService', version='v201607')
        media = [{
            'xsi_type': 'Image',
            'data': image_data,
            'type': 'IMAGE'
        }]
        #media = [{
        #'operator': 'ADD',
        #'operand': {
        #'type':'IMAGE',
        #'sourceUrl':image_url,
        #'name':name
        #}       
        #}]
        import ipdb; ipdb.set_trace()
        media = media_service.upload(media)

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
                
                operations.append(adwords_helper.add_operation_schedule('MONDAY',start_hour,end_hour,arg['campaign_id']))
                operations.append(adwords_helper.add_operation_schedule('TUESDAY',start_hour,end_hour,arg['campaign_id']))
                operations.append(adwords_helper.add_operation_schedule('WEDNESDAY',start_hour,end_hour,arg['campaign_id']))
                operations.append(adwords_helper.add_operation_schedule('THURSDAY',start_hour,end_hour,arg['campaign_id']))
                operations.append(adwords_helper.add_operation_schedule('FRIDAY',start_hour,end_hour,arg['campaign_id']))
                operations.append(adwords_helper.add_operation_schedule('SATURDAY',start_hour,end_hour,arg['campaign_id']))
                operations.append(adwords_helper.add_operation_schedule('SUNDAY',start_hour,end_hour,arg['campaign_id']))
                

        try:
            ad_group_criteria = ad_group_criterion_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Successfully added schedule criterea to campaign.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add schedule criterea to campaign.'
            }

        return response

    def read_schedule(self, **kwargs):
        campaign_id = kwargs.get('campaign_id', None)
        advertiser_id = kwargs.get('advertiser_id',None)
        client = self.get_adwords_client(advertiser_id)
        ad_group_criterion_service = client.GetService('CampaignCriterionService', version='v201607')

        # 'fields': ['DayOfWeek', 'StartHour', 'StartMinute', 'EndHour', 'EndMinute'],
        
        selector = adwords_helper.get_schedule_selector(camp_id) 
        try:
            raw_data = ad_group_criterion_service.get(selector)

            # Display results.
            if 'entries' in raw_data:

                schedule = adwords_helper.process_schedule(raw_data)
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
        
        operations = adwords_helper.process_placement(arg, adgroup_id) 
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
        managed_customer_service = client.GetService('ManagedCustomerService', version='v201605')

        today = datetime.datetime.today().strftime('%Y%m%d %H:%M:%S')
        
        operations = adwords_helper.account_object(arg)
        import ipdb; ipdb.set_trace()
        accounts = managed_customer_service.mutateLink([{'operator': 'ADD', 'operand': {'linkStatus': 'PENDING', 'managerCustomerId': 5484792131, 'clientCustomerId':self.adwords_object[advertiser_id]['ID'], 'pendingDescriptiveName': 'Rockerbox Hindisght', 'isHidden':False}}])
        #accounts = managed_customer_service.mutate(operations)

        return accounts

    def get_account(self, advertiser_id):
        # Initialize appropriate service.
        client = self.get_adwords_client(int(advertiser_id))
        managed_customer_service = client.GetService('ManagedCustomerService', version='v201607')

        # Construct selector to get all accounts.
        selector = adwords_helper.get_account_selector()
        
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

        budget_operations = adwords_helper.get_budget_object(arg)

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
        client = self.get_adwords_client(int(advertiser_id))
        budget_service = client.GetService('BudgetService', version='v201607')
        
        selector = adwords_helper.budget_selector()
        
        try:
            raw_data = budget_service.get(selector)

            if hasattr(raw_data, 'entries'):

                budgets = adwords_helper.get_read_budget(raw_data)
                
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


