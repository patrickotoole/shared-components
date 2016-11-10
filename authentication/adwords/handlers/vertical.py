import ujson
from tornado import web
from adwords import AdWords
import json

class VerticalHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    # List
    def get(self, adgroup_id):
        advertiser_id = self.get_secure_cookie('advertiser')
        adwords_client = self.adwords.get_adwords_client(advertiser_id)
        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

        adgroup_id = str(adgroup_id)

        # ad_group_id = str(self.get_argument('ad_group_id', ''))

        selector = {
            'fields': ['VerticalId', 'VerticalParentId', 'Path'],
            'predicates': [{
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [adgroup_id]
            },{
                'field': 'CriteriaType',
                'operator': 'EQUALS',
                'values': ['VERTICAL']
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            },
            'ordering': [{'field': 'Path', 'sortOrder': 'ASCENDING'}]
        }

        try:
            raw_data = ad_group_criterion_service.get(selector)

            verticals = []

            # Display results.
            if 'entries' in raw_data:
                for keyword in raw_data['entries']:
                    verticals.append({
                        'id': keyword['criterion']['id'],
                        'type': keyword['criterion']['type'],
                        'verticalId': keyword['criterion']['verticalId'],
                        'path': keyword['criterion']['path']
                    })
                response = {
                    'success': True,
                    'verticals': verticals
                }
            else:
                response = {
                    'success': True,
                    'message': 'No verticals were found.',
                    'verticals': []
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to get verticals.'
            }

        self.write(response)

    # Create
    def post(self, adgroup_id):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        adwords_client = self.adwords.get_adwords_client(advertiser_id)

        path = post_data['path']

        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

        vertical = {
            'xsi_type': 'BiddableAdGroupCriterion',
            'adGroupId': adgroup_id,
            'criterion': {
                'xsi_type': 'Vertical',
                'path': path
            }
        }

        operations = [{
            'operator': 'ADD',
            'operand': vertical
        }]

        try:
            ad_group_criteria = ad_group_criterion_service.mutate(operations)
            response = {
                'success': True,
                'message': 'Successfully added vertical criterea to ad group.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add vertical criterea to ad group.'
            }

        self.write(response)
