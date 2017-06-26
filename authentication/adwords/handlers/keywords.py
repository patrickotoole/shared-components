import ujson
from tornado import web
from adwords import AdWords

class KeywordHandler(web.RequestHandler):
    def initialize(self, connectors):
        self.db = connectors.get('db',None)
        self.adwords = connectors.get('adwords',None)

    # List
    def get(self, adgroup_id):
        advertiser_id = self.get_secure_cookie('advertiser')
        adwords_client = self.adwords.get_adwords_client(advertiser_id)
        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201609')

        adgroup_id = str(adgroup_id)

        # ad_group_id = str(self.get_argument('ad_group_id', ''))

        selector = {
            'fields': ['Id', 'CriteriaType', 'KeywordMatchType', 'KeywordText'],
            'predicates': [{
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [adgroup_id]
            },{
                'field': 'CriteriaType',
                'operator': 'EQUALS',
                'values': ['KEYWORD']
            }],
            'paging': {
                'startIndex': str(0),
                'numberResults': str(PAGE_SIZE)
            },
            'ordering': [{'field': 'KeywordText', 'sortOrder': 'ASCENDING'}]
        }

        try:
            raw_data = ad_group_criterion_service.get(selector)

            keywords = []

            # Display results.
            # Display results.
            if 'entries' in raw_data:
                for keyword in raw_data['entries']:
                    keywords.append({
                        'id': keyword['criterion']['id'],
                        'type': keyword['criterion']['type'],
                        'url': keyword['criterion']['url'],
                        'matchtype': keyword['criterion']['matchType']
                    })

                response = {
                    'success': True,
                    'keywords': keywords
                }
            else:
                response = {
                    'success': True,
                    'message': 'No keywords were found.',
                    'keywords': []
                }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to get keywords.'
            }

        self.write(response)

    # Create
    def post(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        adwords_client = self.adwords.get_adwords_client(advertiser_id)

        ad_group_id = str(post_data['ad_group_id'])
        keyword_string = str(post_data['keyword'])

        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201609')

        keyword = {
            'xsi_type': 'BiddableAdGroupCriterion',
            'adGroupId': ad_group_id,
            'criterion': {
                'xsi_type': 'Keyword',
                'matchType': 'BROAD',
                'text': keyword_string
            }
        }

        operations = [{
            'operator': 'ADD',
            'operand': keyword
        }]

        try:
            ad_group_criteria = ad_group_criterion_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Successfully added keyword to ad group.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add keyword to ad group.'
            }

        self.write(response)

    # Remove
    def delete(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        adwords_client = self.adwords.get_adwords_client(advertiser_id)

        ad_group_id = str(post_data['ad_group_id'])
        criterion_id = str(post_data['criterion_id'])

        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201609')

        operations = [{
            'operator': 'REMOVE',
            'operand': {
                'xsi_type': 'BiddableAdGroupCriterion',
                'adGroupId': ad_group_id,
                'criterion': {
                    'id': criterion_id
                }
            }
        }]

        try:
            result = ad_group_criterion_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Successfully removed keyword from ad group.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to remove a keyword.'
            }

