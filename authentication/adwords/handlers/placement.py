import ujson
from tornado import web
from adwords import AdWords
import json

PAGE_SIZE=10000
QUERY = "insert into advertiser_adwords_placement (advertiser_id, adgroup_id, placement_id, url, cpmbidamount) values ('%s', %s, %s, '%s', %s)"

class PlacementHandler(web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    # List
    def get(self):
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
            tempdata = {}
            tempdata['adgroup_id'] = adgroup_id
            tempdata['data'] = []
            if 'entries' in raw_data:
                for place in raw_data['entries']:
                    temp = {}
                    temp['url'] = place[2]['url']
                    temp['id'] = place[2]['id']
                    tempdata['data'].append(temp)
            self.render('templates/placement.html', data=tempdata)
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to get placements.'
            }
            self.write(response)

    # Create
    def post(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        placement_url = self.get_argument('url', False)
        adgroup_id = self.get_argument('adgroup_id', False)

        if not placement_url:
            post_data = json.loads(self.request.body)
            advertiser_id = int(post_data['advertiser_id'])
            placement_url = str(post_data['placement_url'])
            adgroup_id = post_data['adgroup_id']

        adwords_client = self.adwords.get_adwords_client(int(advertiser_id))
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
            placement_id = ad_group_criteria[1][0][1]['id']
            url = ad_group_criteria[1][0][1]['url']
            cpm = ad_group_criteria[1][0][6][3][0][1][1]
            self.db.execute(QUERY % (str(advertiser_id),int(adgroup_id),int(placement_id), url, cpm))
            

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

            raw_data = ad_group_criterion_service.get(selector)
            placements = []
            tempdata = {}
            tempdata['adgroup_id'] = adgroup_id
            tempdata['data'] = []
            if 'entries' in raw_data:
                for place in raw_data['entries']:
                    temp = {}
                    temp['url'] = place[2]['url']
                    temp['id'] = place[2]['id']
                    tempdata['data'].append(temp)
            self.render('templates/placement.html', data=tempdata)
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to add placement criterea to ad group.'
            }

            self.write(response)

