import ujson
from tornado import web
from adwords import AdWords
import json

PAGE_SIZE=10000

class PlacementHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    # List
    def get(self, oldadgroup):
        advertiser_id = self.get_secure_cookie('advertiser')
        adwords_client = self.adwords.get_adwords_client(int(advertiser_id))
        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

        adgroup_id = self.get_argument('adgroup_id','')
        adgroup_id = str(adgroup_id)

        # ad_group_id = str(self.get_argument('ad_group_id', ''))

        selector = {
            'fields': ['Id', 'CriteriaType', 'PlacementUrl'],
            'predicates': [{
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [adgroup_id]
            },
            {
                'field': 'CriteriaType',
                'operator': 'EQUALS',
                'values': ['PLACEMENT']
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            },
            'ordering': [{'field': 'PlacementUrl', 'sortOrder': 'ASCENDING'}]
        }

        try:
            raw_data = ad_group_criterion_service.get(selector)

            placements = []

            # Display results.
            if 'entries' in raw_data:
                #for keyword in raw_data['entries']:
                #    placements.append({
                #        'id': keyword['criterion']['id'],
                #        'type': keyword['criterion']['type'],
                #        'url': keyword['criterion']['url']
                #    })

                response = {
                    'success': True,
                    #'placements': placements
                    'placement':ujson.dumps(raw_data)
                }
            else:
                response = {
                    'success': True,
                    'message': 'No placements were found.',
                    'placements': []
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to get placements.'
            }

        self.write(response)

    # Create
    def post(self, adgroup_id):
        post_data = json.loads(self.request.body)
        advertiser_id = int(post_data['advertiser_id'])
        adwords_client = self.adwords.get_adwords_client(advertiser_id)

        placement_url = str(post_data['placement_url'])
        adgroup_id = post_data['adgroup_id']

        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

        placement = {
            'xsi_type': 'BiddableAdGroupCriterion',
            'adGroupId': adgroup_id,
            'criterion': {
                'xsi_type': 'Placement',
                'url': placement_url
            }
        }

        operations = [{
            'operator': 'ADD',
            'operand': placement
        }]

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

        self.write(response)

