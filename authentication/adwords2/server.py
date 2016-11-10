# Notes:
# - What if user has multiple customer ids, which one is selected?
# - Pip install "googleads" required
# - What happens when user has over 10,000 campaigns?
# - Create advertiser user parameters (timezone/currency etc)

# PAUSED / ENABLED / REMOVED
import tornado.ioloop
from tornado import httpserver
from tornado import web
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
import requests
from tornado import httpserver
from tornado import web
from adwords import AdWords


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


class IndexHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        auth_uri = flow.step1_get_authorize_url()
        advertiser_id = self.get_secure_cookie('advertiser')
        self.write('You are currently logged in with advertiser id %s' % advertiser_id)
        self.write('<a href="/authorize" style="display: inline-block; border: solid 1px #e0e0e0; background-color: #fafafa; line-height: 24px; padding: 8px; border-radius: 3px; color: #666; text-decoration: none; font-family: sans-serif; font-size: 14px;"><svg style="display: inline-block; float: left; margin-right: 5px;" version="1.1" id="Layer_3" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="24px" viewBox="0 -180 20 80" xml:space="preserve"><g><path fill="#0F9D59" d="M26.864-100.747l17.997,0.003l-0.018-0.041l-24.577-73.752v70.98C21.937-101.833,24.266-100.747,26.864-100.747"></path><path fill="#0A6E3D" d="M7.903-137.693l10.271,30.826c0.003,0.006,0.003,0.012,0.006,0.023c0.448,1.251,1.172,2.355,2.077,3.29v-70.978l-0.026-0.07L7.903-137.693z"></path><path fill="#4284F4" d="M-4.419-174.604l-0.006,0.026l-0.009-0.026l-24.604,73.822l-0.018,0.038h17.997c2.596,0,4.928-1.081,6.601-2.818c0.902-0.932,1.626-2.036,2.074-3.287c0.003-0.012,0.003-0.018,0.006-0.018l22.614-67.746H-4.425v0.009H-4.419z"></path></g></svg>Connect with AdWords</a>')
        self.finish()


class AuthorizeHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        auth_uri = flow.step1_get_authorize_url()
        self.redirect(auth_uri)


class CallbackHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        auth_code = self.get_argument('code')
        credentials = flow.step2_exchange(auth_code)
        advertiser_id = self.get_secure_cookie('advertiser')

        account = AdWords().Account.create({
            'name': 'Rockerbox AI Trader',
            'currency': 'USD',
            'timezone': 'America/New_York',
        })

        account_id = account['value'][0]['customerId']

        sql = "INSERT INTO `advertiser_adwords` (`advertiser_id`, `account_id`, `token`, `ts_created`) VALUES ('%(advertiser_id)s', %(account_id)d, '%(token)s', NOW()) ON DUPLICATE KEY UPDATE token='%(token)s';" % {
            'advertiser_id': advertiser_id,
            'account_id': account_id,
            'token': credentials.to_json()
        }
        df = self.db.execute(sql)

        self.write(sql)


class AccountHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self):
        response = AdWords().Account.get()

        self.write(json.dumps(response))

    # Create
    def post(self):
        response = AdWords().Account.create({
            'name': 'Rockerbox Test',
            'currency': 'USD',
            'timezone': 'America/New_York',
        })

        self.write(json.dumps(response['value'][0]['customerId']))


class CampaignHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self):
        response = AdWords().Campaign.read()

        self.write(response)

    # Create
    def post(self):
        post_data = json.loads(self.request.body)

        response = AdWords().Campaign.create({
            'budget_id': str(post_data['budget_id']),
            'name': '%s #%s' % (post_data['name'], uuid.uuid4()),
            'impressions': str(post_data['impressions'])
        })

        self.write(response)

    # Update
    # id: campaign_id
    # status: ENABLED, PAUSED
    def put(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        campaign_service = adwords_client.GetService('CampaignService', version='v201607')
        
        campaign_id = str(post_data['id'])
        status = str(post_data['status'])

        operations = [{
            'operator': 'SET',
            'operand': {
                'id': campaign_id,
                'status': status
            }
        }]

        try:
            campaigns = campaign_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Campaign successfully updated.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to update the campaign.'
            }

        self.write(response)

    # Remove
    # id: campaign_id
    def delete(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        campaign_service = adwords_client.GetService('CampaignService', version='v201607')
        campaign_id = str(post_data['id'])

        operations = [{
            'operator': 'SET',
            'operand': {
                'id': campaign_id,
                'status': 'REMOVED'
            }
        }]

        try:
            campaigns = campaign_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Campaign successfully removed.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to remove the campaign.'
            }

        self.write(response)


class AdHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self):
        adwords_client = getAdwordsClient()
        ad_group_id = str(self.get_argument('ad_group_id', ''))

        ad_group_ad_service = adwords_client.GetService('AdGroupAdService', version='v201607')

        selector = {
        'fields': ['Id', 'AdGroupId', 'Status'],
        'predicates': [
            {
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [ad_group_id]
            },{
                'field': 'AdType',
                'operator': 'EQUALS',
                'values': ['TEXT_AD']
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

        self.write(response)

    # Create
    def post(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        ad_group_ad_service = adwords_client.GetService('AdGroupAdService', version='v201607')

        # 'exemptionRequests': [{
        #     # This comes back in a PolicyViolationError.
        #     'key' {
        #         'policyName': '...',
        #         'violatingText': '...'
        #     }
        # }]

        final_url = post_data['final_url']
        display_url = post_data['display_url']
        description1 = post_data['description1']
        description2 = post_data['description2']
        headline = post_data['headline']

        operations = [{
            'operator': 'ADD',
            'operand': {
                'xsi_type': 'AdGroupAd',
                'adGroupId': ad_group_id,
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
        
        try:
            ads = ad_group_ad_service.mutate(operations)
            response = {
                'success': True,
                'message': 'Successfully created a text ad.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to create an ad.'
            }

        self.write(response)
                

    # Pause
    def put(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        ad_group_id = post_data['ad_group_id']
        ad_id = post_data['ad_id']

        ad_group_ad_service = adwords_client.GetService('AdGroupAdService', version='v201607')

        operations = [{
            'operator': 'SET',
            'operand': {
                'adGroupId': ad_group_id,
                'ad': {
                    'id': ad_id,
                },
                'status': 'PAUSED'
            }
        }]

        try:
            ads = ad_group_ad_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Successfully paused an ad.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to pause an ad.'
            }

        self.write(response)

    # Remove
    def delete(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        ad_group_id = post_data['ad_group_id']
        ad_id = post_data['ad_id']

        ad_group_ad_service = adwords_client.GetService('AdGroupAdService', version='v201607')

        operations = [{
            'operator': 'SET',
            'operand': {
                'adGroupId': ad_group_id,
                'ad': {
                    'id': ad_id,
                },
                'status': 'REMOVE'
            }
        }]

        try:
            result = ad_group_ad_service.mutate(operations)

            response = {
                'success': True,
                'message': 'Successfully removed an ad.'
            }
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while trying to remove an ad.'
            }

        self.write(response)


class AdGroupHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self):
        arg = {
            'campaign_id': self.get_argument('campaign_id', '')
        }

        response = AdWords().AdGroup.read(arg)

        self.write(response)

    # Create
    def post(self):
        post_data = json.loads(self.request.body)
        
        arg = {
            'campaign_id': str(post_data['campaign_id']),
            'adgroup_name': str(post_data['name']),
            'bid_amount': str(post_data['bid_amount'])
        }

        response = AdWords().AdGroup.create(arg)

        self.write(response)

    # Edit
    def put(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        ad_group_id = str(post_data['ad_group_id'])
        status = str(post_data['status'])

        ad_group_service = adwords_client.GetService('AdGroupService', version='v201609')

        operations = [{
            'operator': 'SET',
            'operand': {
                'id': ad_group_id,
                'status': status
            }
        }]
        ad_groups = ad_group_service.mutate(operations)

    # Remove
    def delete(self):
        post_data = json.loads(self.request.body)
        adwords_client = getAdwordsClient()

        ad_group_id = str(post_data['ad_group_id'])

        ad_group_service = adwords_client.GetService('AdGroupService', version='v201609')

        operations = [{
            'operator': 'SET',
            'operand': {
                'id': ad_group_id,
                'status': 'REMOVED'
            }
        }]
        result = ad_group_service.mutate(operations)


class KeywordHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self, adgroup_id):
        adwords_client = getAdwordsClient()
        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

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
        adwords_client = getAdwordsClient()
        
        ad_group_id = str(post_data['ad_group_id'])
        keyword_string = str(post_data['keyword'])

        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

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
        adwords_client = getAdwordsClient()

        ad_group_id = str(post_data['ad_group_id'])
        criterion_id = str(post_data['criterion_id'])

        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

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


class PlacementHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self, adgroup_id):
        adwords_client = getAdwordsClient()
        ad_group_criterion_service = adwords_client.GetService('AdGroupCriterionService', version='v201607')

        adgroup_id = str(adgroup_id)

        # ad_group_id = str(self.get_argument('ad_group_id', ''))

        selector = {
            'fields': ['Id', 'CriteriaType', 'PlacementUrl'],
            'predicates': [{
                'field': 'AdGroupId',
                'operator': 'EQUALS',
                'values': [adgroup_id]
            },{
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
                for keyword in raw_data['entries']:
                    placements.append({
                        'id': keyword['criterion']['id'],
                        'type': keyword['criterion']['type'],
                        'url': keyword['criterion']['url']
                    })

                response = {
                    'success': True,
                    'placements': placements
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
        adwords_client = getAdwordsClient()

        placement_url = str(post_data['placement_url'])

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


class VerticalHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self, adgroup_id):
        adwords_client = getAdwordsClient()
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
        adwords_client = getAdwordsClient()

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


class ScheduleHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self, campaign_id):
        response = AdWords().Schedule.read(campaign_id)

        self.write(response)

    # Create
    def post(self, campaign_id):
        post_data = json.loads(self.request.body)

        schedule = {
            'campaign_id': campaign_id
        }

        response = AdWords().Schedule.create(schedule)

        self.write(response)


class ReportHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        adwords_client = getAdwordsClient()
        report_downloader = adwords_client.GetReportDownloader(version='v201607')

        # Create report definition.
        report = {
            'reportName': 'Last 7 days CRITERIA_PERFORMANCE_REPORT',
            'dateRangeType': 'LAST_7_DAYS',
            'reportType': 'CRITERIA_PERFORMANCE_REPORT',
            'downloadFormat': 'CSV',
            'selector': {
                'fields': ['CampaignId', 'AdGroupId', 'Id', 'CriteriaType',
                'Criteria', 'FinalUrls', 'Impressions', 'Clicks', 'Cost']
            }
        }

        try:
            report_output = StringIO.StringIO()

            report_downloader.DownloadReport(
            report, report_output, skip_report_header=False, skip_column_header=False,
            skip_report_summary=False)

            response = {
                'success': True,
                'reports': []
            }
            raw_data = report_output.getvalue().split('\n')
            row_i = 1

            for row in raw_data:
                if(row_i > 2 and row != ''):
                    columns = [x.strip() for x in row.split(',')]
                    response['reports'].append({
                        'campaign_id': columns[0],
                        'ad_group_id': columns[1],
                        'keyword_id': columns[2],
                        'criteria_type': columns[3],
                        'keyword_placement': columns[4],
                        'final_url': columns[5],
                        'impressions': columns[6],
                        'clicks': columns[7],
                        'cost': columns[8]
                    })
                row_i += 1
        except:
            response = {
                'success': False,
                'message': 'Something went wrong while generating the reports.'
            }

        self.write(response)


class BudgetHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        response = AdWords().Budget.read()

        self.write(response)

    def post(self):
        post_data = json.loads(self.request.body)
        budget_input = {
            'name': '%s #%s' % (post_data['name'], uuid.uuid4()),
            'amount': str(post_data['amount'])
        }
        response = AdWords().Budget.create(budget_input)

        self.write(response)

# adwords = {
#     'campaign': {
#         'create': 
#     }
# }


class CustomerHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        response = AdWords().Customer.get()

        self.write(json.dumps(response))




class ManageHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        advertiser_id = 713924

        # Get Hindsight Data
        cookies = {
            'advertiser': '2|1:0|10:1475769532|10:advertiser|8:Nzg3ODM5|bf2a9d7e296cb522075f5c82be372bd4de78ca169abe7b49fd7aaed353432509',
            'user': '2|1:0|10:1475769532|4:user|16:YV9mc2FzdG9yZQ==|b57cd27a27e2ad0dfb4df3a27f53ef6157d6534ab3f20bcf712ffc882151ba9e'
        }

        r = requests.get('http://beta.crusher.getrockerbox.com/crusher/v1/visitor/mediaplan?url_pattern=/', cookies=cookies)
        hindsight_data = json.loads(r.content)

        # hindsight_data = {"search": [["/"]], "results": [], "summary": {}, "mediaplan": [{"count": 2, "domain": "funnyordie.com", "uniques": 2, "hour": "00", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "likes.com", "uniques": 3, "hour": "00", "parent_category_name": "Arts & Entertainment"}, {"count": 8, "domain": "ranker.com", "uniques": 3, "hour": "00", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "therichest.com", "uniques": 2, "hour": "00", "parent_category_name": "Arts & Entertainment"}, {"count": 6, "domain": "funnyordie.com", "uniques": 4, "hour": "01", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "likes.com", "uniques": 2, "hour": "01", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "npr.org", "uniques": 3, "hour": "01", "parent_category_name": "Arts & Entertainment"}, {"count": 17, "domain": "ranker.com", "uniques": 5, "hour": "01", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "funnyordie.com", "uniques": 4, "hour": "02", "parent_category_name": "Arts & Entertainment"}, {"count": 6, "domain": "likes.com", "uniques": 3, "hour": "02", "parent_category_name": "Arts & Entertainment"}, {"count": 23, "domain": "ranker.com", "uniques": 7, "hour": "02", "parent_category_name": "Arts & Entertainment"}, {"count": 7, "domain": "therichest.com", "uniques": 3, "hour": "02", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "funnyordie.com", "uniques": 3, "hour": "03", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "likes.com", "uniques": 2, "hour": "03", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "popsugar.com", "uniques": 2, "hour": "03", "parent_category_name": "Arts & Entertainment"}, {"count": 34, "domain": "ranker.com", "uniques": 6, "hour": "03", "parent_category_name": "Arts & Entertainment"}, {"count": 38, "domain": "ranker.com", "uniques": 5, "hour": "04", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "likes.com", "uniques": 3, "hour": "05", "parent_category_name": "Arts & Entertainment"}, {"count": 26, "domain": "ranker.com", "uniques": 5, "hour": "05", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "therichest.com", "uniques": 2, "hour": "05", "parent_category_name": "Arts & Entertainment"}, {"count": 36, "domain": "ranker.com", "uniques": 4, "hour": "06", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "therichest.com", "uniques": 2, "hour": "06", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "likes.com", "uniques": 5, "hour": "07", "parent_category_name": "Arts & Entertainment"}, {"count": 38, "domain": "ranker.com", "uniques": 5, "hour": "07", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "therichest.com", "uniques": 3, "hour": "07", "parent_category_name": "Arts & Entertainment"}, {"count": 49, "domain": "ranker.com", "uniques": 5, "hour": "08", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "therichest.com", "uniques": 2, "hour": "08", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "likes.com", "uniques": 3, "hour": "09", "parent_category_name": "Arts & Entertainment"}, {"count": 50, "domain": "ranker.com", "uniques": 6, "hour": "09", "parent_category_name": "Arts & Entertainment"}, {"count": 7, "domain": "likes.com", "uniques": 6, "hour": "10", "parent_category_name": "Arts & Entertainment"}, {"count": 42, "domain": "ranker.com", "uniques": 5, "hour": "10", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "therichest.com", "uniques": 3, "hour": "10", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "likes.com", "uniques": 5, "hour": "11", "parent_category_name": "Arts & Entertainment"}, {"count": 46, "domain": "ranker.com", "uniques": 5, "hour": "11", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "therichest.com", "uniques": 4, "hour": "11", "parent_category_name": "Arts & Entertainment"}, {"count": 16, "domain": "dailymail.co.uk", "uniques": 2, "hour": "12", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "likes.com", "uniques": 4, "hour": "12", "parent_category_name": "Arts & Entertainment"}, {"count": 44, "domain": "ranker.com", "uniques": 5, "hour": "12", "parent_category_name": "Arts & Entertainment"}, {"count": 6, "domain": "therichest.com", "uniques": 3, "hour": "12", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "dailymail.co.uk", "uniques": 2, "hour": "13", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "likes.com", "uniques": 2, "hour": "13", "parent_category_name": "Arts & Entertainment"}, {"count": 17, "domain": "ranker.com", "uniques": 3, "hour": "13", "parent_category_name": "Arts & Entertainment"}, {"count": 7, "domain": "likes.com", "uniques": 3, "hour": "14", "parent_category_name": "Arts & Entertainment"}, {"count": 32, "domain": "ranker.com", "uniques": 5, "hour": "14", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "therichest.com", "uniques": 2, "hour": "14", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "likes.com", "uniques": 2, "hour": "15", "parent_category_name": "Arts & Entertainment"}, {"count": 22, "domain": "ranker.com", "uniques": 6, "hour": "15", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "likes.com", "uniques": 4, "hour": "16", "parent_category_name": "Arts & Entertainment"}, {"count": 41, "domain": "pandora.com", "uniques": 2, "hour": "16", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "popsugar.com", "uniques": 2, "hour": "16", "parent_category_name": "Arts & Entertainment"}, {"count": 57, "domain": "ranker.com", "uniques": 6, "hour": "16", "parent_category_name": "Arts & Entertainment"}, {"count": 8, "domain": "likes.com", "uniques": 5, "hour": "17", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "people.com", "uniques": 2, "hour": "17", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "popsugar.com", "uniques": 3, "hour": "17", "parent_category_name": "Arts & Entertainment"}, {"count": 54, "domain": "ranker.com", "uniques": 6, "hour": "17", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "cbs.com", "uniques": 2, "hour": "18", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "funnyordie.com", "uniques": 2, "hour": "18", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "likes.com", "uniques": 2, "hour": "18", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "popsugar.com", "uniques": 2, "hour": "18", "parent_category_name": "Arts & Entertainment"}, {"count": 39, "domain": "ranker.com", "uniques": 4, "hour": "18", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "likes.com", "uniques": 3, "hour": "19", "parent_category_name": "Arts & Entertainment"}, {"count": 11, "domain": "people.com", "uniques": 2, "hour": "19", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "popsugar.com", "uniques": 2, "hour": "19", "parent_category_name": "Arts & Entertainment"}, {"count": 35, "domain": "ranker.com", "uniques": 6, "hour": "19", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "therichest.com", "uniques": 2, "hour": "19", "parent_category_name": "Arts & Entertainment"}, {"count": 13, "domain": "usmagazine.com", "uniques": 3, "hour": "19", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "funnyordie.com", "uniques": 2, "hour": "20", "parent_category_name": "Arts & Entertainment"}, {"count": 4, "domain": "likes.com", "uniques": 2, "hour": "20", "parent_category_name": "Arts & Entertainment"}, {"count": 51, "domain": "people.com", "uniques": 2, "hour": "20", "parent_category_name": "Arts & Entertainment"}, {"count": 9, "domain": "ranker.com", "uniques": 3, "hour": "20", "parent_category_name": "Arts & Entertainment"}, {"count": 30, "domain": "usmagazine.com", "uniques": 3, "hour": "20", "parent_category_name": "Arts & Entertainment"}, {"count": 5, "domain": "funnyordie.com", "uniques": 4, "hour": "21", "parent_category_name": "Arts & Entertainment"}, {"count": 14, "domain": "ranker.com", "uniques": 3, "hour": "21", "parent_category_name": "Arts & Entertainment"}, {"count": 16, "domain": "usmagazine.com", "uniques": 2, "hour": "21", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "likes.com", "uniques": 2, "hour": "22", "parent_category_name": "Arts & Entertainment"}, {"count": 14, "domain": "ranker.com", "uniques": 3, "hour": "22", "parent_category_name": "Arts & Entertainment"}, {"count": 3, "domain": "likes.com", "uniques": 2, "hour": "23", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "popsugar.com", "uniques": 2, "hour": "23", "parent_category_name": "Arts & Entertainment"}, {"count": 13, "domain": "ranker.com", "uniques": 2, "hour": "23", "parent_category_name": "Arts & Entertainment"}, {"count": 2, "domain": "yogajournal.com", "uniques": 2, "hour": "00", "parent_category_name": "Beauty & Personal Care"}, {"count": 3, "domain": "yogajournal.com", "uniques": 3, "hour": "02", "parent_category_name": "Beauty & Personal Care"}, {"count": 3, "domain": "yogajournal.com", "uniques": 2, "hour": "05", "parent_category_name": "Beauty & Personal Care"}, {"count": 8, "domain": "yogajournal.com", "uniques": 3, "hour": "06", "parent_category_name": "Beauty & Personal Care"}, {"count": 2, "domain": "yogajournal.com", "uniques": 2, "hour": "08", "parent_category_name": "Beauty & Personal Care"}, {"count": 4, "domain": "yogajournal.com", "uniques": 3, "hour": "10", "parent_category_name": "Beauty & Personal Care"}, {"count": 3, "domain": "yogajournal.com", "uniques": 2, "hour": "11", "parent_category_name": "Beauty & Personal Care"}, {"count": 4, "domain": "yogajournal.com", "uniques": 3, "hour": "12", "parent_category_name": "Beauty & Personal Care"}, {"count": 2, "domain": "yogajournal.com", "uniques": 2, "hour": "13", "parent_category_name": "Beauty & Personal Care"}, {"count": 6, "domain": "yogajournal.com", "uniques": 3, "hour": "14", "parent_category_name": "Beauty & Personal Care"}, {"count": 2, "domain": "yogajournal.com", "uniques": 2, "hour": "16", "parent_category_name": "Beauty & Personal Care"}, {"count": 2, "domain": "steadyhealth.com", "uniques": 2, "hour": "17", "parent_category_name": "Beauty & Personal Care"}, {"count": 7, "domain": "manrepeller.com", "uniques": 2, "hour": "18", "parent_category_name": "Beauty & Personal Care"}, {"count": 2, "domain": "yogajournal.com", "uniques": 2, "hour": "22", "parent_category_name": "Beauty & Personal Care"}, {"count": 3, "domain": "yellowpages.com", "uniques": 2, "hour": "02", "parent_category_name": "Business & Industry"}, {"count": 3, "domain": "linkedin.com", "uniques": 2, "hour": "15", "parent_category_name": "Business & Industry"}, {"count": 9, "domain": "monster.com", "uniques": 2, "hour": "15", "parent_category_name": "Business & Industry"}, {"count": 17, "domain": "linkedin.com", "uniques": 2, "hour": "18", "parent_category_name": "Business & Industry"}, {"count": 9, "domain": "linkedin.com", "uniques": 4, "hour": "19", "parent_category_name": "Business & Industry"}, {"count": 2, "domain": "linkedin.com", "uniques": 2, "hour": "20", "parent_category_name": "Business & Industry"}, {"count": 3, "domain": "linkedin.com", "uniques": 3, "hour": "21", "parent_category_name": "Business & Industry"}, {"count": 2, "domain": "monster.com", "uniques": 2, "hour": "21", "parent_category_name": "Business & Industry"}, {"count": 6, "domain": "newegg.com", "uniques": 2, "hour": "23", "parent_category_name": "Computers & Electronics"}, {"count": 17, "domain": "kiplinger.com", "uniques": 2, "hour": "03", "parent_category_name": "Finance"}, {"count": 6, "domain": "cheatsheet.com", "uniques": 2, "hour": "17", "parent_category_name": "Finance"}, {"count": 2, "domain": "thestreet.com", "uniques": 2, "hour": "19", "parent_category_name": "Finance"}, {"count": 10, "domain": "food.com", "uniques": 2, "hour": "18", "parent_category_name": "Food & Drink"}, {"count": 8, "domain": "healthline.com", "uniques": 2, "hour": "18", "parent_category_name": "Health"}, {"count": 9, "domain": "msn.com", "uniques": 3, "hour": "00", "parent_category_name": "Internet & Telecom"}, {"count": 6, "domain": "outlook.com", "uniques": 3, "hour": "00", "parent_category_name": "Internet & Telecom"}, {"count": 4, "domain": "msn.com", "uniques": 2, "hour": "01", "parent_category_name": "Internet & Telecom"}, {"count": 11, "domain": "outlook.com", "uniques": 2, "hour": "01", "parent_category_name": "Internet & Telecom"}, {"count": 6, "domain": "outlook.com", "uniques": 2, "hour": "10", "parent_category_name": "Internet & Telecom"}, {"count": 15, "domain": "msn.com", "uniques": 5, "hour": "11", "parent_category_name": "Internet & Telecom"}, {"count": 27, "domain": "outlook.com", "uniques": 3, "hour": "11", "parent_category_name": "Internet & Telecom"}, {"count": 28, "domain": "msn.com", "uniques": 8, "hour": "12", "parent_category_name": "Internet & Telecom"}, {"count": 13, "domain": "outlook.com", "uniques": 4, "hour": "12", "parent_category_name": "Internet & Telecom"}, {"count": 16, "domain": "msn.com", "uniques": 10, "hour": "13", "parent_category_name": "Internet & Telecom"}, {"count": 3, "domain": "my.xfinity.com", "uniques": 2, "hour": "13", "parent_category_name": "Internet & Telecom"}, {"count": 88, "domain": "outlook.com", "uniques": 4, "hour": "13", "parent_category_name": "Internet & Telecom"}, {"count": 35, "domain": "msn.com", "uniques": 11, "hour": "14", "parent_category_name": "Internet & Telecom"}, {"count": 4, "domain": "my.xfinity.com", "uniques": 2, "hour": "14", "parent_category_name": "Internet & Telecom"}, {"count": 42, "domain": "outlook.com", "uniques": 4, "hour": "14", "parent_category_name": "Internet & Telecom"}, {"count": 25, "domain": "msn.com", "uniques": 6, "hour": "15", "parent_category_name": "Internet & Telecom"}, {"count": 2, "domain": "my.xfinity.com", "uniques": 2, "hour": "15", "parent_category_name": "Internet & Telecom"}, {"count": 23, "domain": "outlook.com", "uniques": 3, "hour": "15", "parent_category_name": "Internet & Telecom"}, {"count": 10, "domain": "msn.com", "uniques": 3, "hour": "16", "parent_category_name": "Internet & Telecom"}, {"count": 4, "domain": "my.xfinity.com", "uniques": 3, "hour": "16", "parent_category_name": "Internet & Telecom"}, {"count": 14, "domain": "outlook.com", "uniques": 3, "hour": "16", "parent_category_name": "Internet & Telecom"}, {"count": 83, "domain": "msn.com", "uniques": 13, "hour": "17", "parent_category_name": "Internet & Telecom"}, {"count": 4, "domain": "my.xfinity.com", "uniques": 3, "hour": "17", "parent_category_name": "Internet & Telecom"}, {"count": 30, "domain": "outlook.com", "uniques": 5, "hour": "17", "parent_category_name": "Internet & Telecom"}, {"count": 15, "domain": "msn.com", "uniques": 7, "hour": "18", "parent_category_name": "Internet & Telecom"}, {"count": 35, "domain": "outlook.com", "uniques": 5, "hour": "18", "parent_category_name": "Internet & Telecom"}, {"count": 25, "domain": "msn.com", "uniques": 10, "hour": "19", "parent_category_name": "Internet & Telecom"}, {"count": 28, "domain": "outlook.com", "uniques": 5, "hour": "19", "parent_category_name": "Internet & Telecom"}, {"count": 11, "domain": "msn.com", "uniques": 6, "hour": "20", "parent_category_name": "Internet & Telecom"}, {"count": 25, "domain": "outlook.com", "uniques": 5, "hour": "20", "parent_category_name": "Internet & Telecom"}, {"count": 22, "domain": "msn.com", "uniques": 4, "hour": "21", "parent_category_name": "Internet & Telecom"}, {"count": 9, "domain": "outlook.com", "uniques": 3, "hour": "21", "parent_category_name": "Internet & Telecom"}, {"count": 10, "domain": "msn.com", "uniques": 3, "hour": "22", "parent_category_name": "Internet & Telecom"}, {"count": 24, "domain": "outlook.com", "uniques": 2, "hour": "22", "parent_category_name": "Internet & Telecom"}, {"count": 37, "domain": "msn.com", "uniques": 2, "hour": "23", "parent_category_name": "Internet & Telecom"}, {"count": 8, "domain": "boston.com", "uniques": 4, "hour": "00", "parent_category_name": "News"}, {"count": 115, "domain": "businessinsider.com", "uniques": 9, "hour": "00", "parent_category_name": "News"}, {"count": 13, "domain": "yourdailydish.com", "uniques": 3, "hour": "00", "parent_category_name": "News"}, {"count": 6, "domain": "boston.com", "uniques": 6, "hour": "01", "parent_category_name": "News"}, {"count": 131, "domain": "businessinsider.com", "uniques": 14, "hour": "01", "parent_category_name": "News"}, {"count": 4, "domain": "cnn.com", "uniques": 2, "hour": "01", "parent_category_name": "News"}, {"count": 2, "domain": "macrumors.com", "uniques": 2, "hour": "01", "parent_category_name": "News"}, {"count": 41, "domain": "yourdailydish.com", "uniques": 6, "hour": "01", "parent_category_name": "News"}, {"count": 16, "domain": "boston.com", "uniques": 7, "hour": "02", "parent_category_name": "News"}, {"count": 147, "domain": "businessinsider.com", "uniques": 15, "hour": "02", "parent_category_name": "News"}, {"count": 3, "domain": "macrumors.com", "uniques": 2, "hour": "02", "parent_category_name": "News"}, {"count": 3, "domain": "nytimes.com", "uniques": 2, "hour": "02", "parent_category_name": "News"}, {"count": 52, "domain": "yourdailydish.com", "uniques": 8, "hour": "02", "parent_category_name": "News"}, {"count": 7, "domain": "boston.com", "uniques": 5, "hour": "03", "parent_category_name": "News"}, {"count": 144, "domain": "businessinsider.com", "uniques": 17, "hour": "03", "parent_category_name": "News"}, {"count": 5, "domain": "macrumors.com", "uniques": 3, "hour": "03", "parent_category_name": "News"}, {"count": 60, "domain": "yourdailydish.com", "uniques": 7, "hour": "03", "parent_category_name": "News"}, {"count": 3, "domain": "boston.com", "uniques": 2, "hour": "04", "parent_category_name": "News"}, {"count": 136, "domain": "businessinsider.com", "uniques": 13, "hour": "04", "parent_category_name": "News"}, {"count": 7, "domain": "macrumors.com", "uniques": 3, "hour": "04", "parent_category_name": "News"}, {"count": 41, "domain": "yourdailydish.com", "uniques": 6, "hour": "04", "parent_category_name": "News"}, {"count": 3, "domain": "boston.com", "uniques": 3, "hour": "05", "parent_category_name": "News"}, {"count": 131, "domain": "businessinsider.com", "uniques": 14, "hour": "05", "parent_category_name": "News"}, {"count": 5, "domain": "chicagotribune.com", "uniques": 2, "hour": "05", "parent_category_name": "News"}, {"count": 5, "domain": "macrumors.com", "uniques": 3, "hour": "05", "parent_category_name": "News"}, {"count": 53, "domain": "yourdailydish.com", "uniques": 7, "hour": "05", "parent_category_name": "News"}, {"count": 124, "domain": "businessinsider.com", "uniques": 12, "hour": "06", "parent_category_name": "News"}, {"count": 6, "domain": "macrumors.com", "uniques": 2, "hour": "06", "parent_category_name": "News"}, {"count": 55, "domain": "yourdailydish.com", "uniques": 6, "hour": "06", "parent_category_name": "News"}, {"count": 140, "domain": "businessinsider.com", "uniques": 13, "hour": "07", "parent_category_name": "News"}, {"count": 71, "domain": "yourdailydish.com", "uniques": 7, "hour": "07", "parent_category_name": "News"}, {"count": 141, "domain": "businessinsider.com", "uniques": 12, "hour": "08", "parent_category_name": "News"}, {"count": 12, "domain": "macrumors.com", "uniques": 3, "hour": "08", "parent_category_name": "News"}, {"count": 73, "domain": "yourdailydish.com", "uniques": 6, "hour": "08", "parent_category_name": "News"}, {"count": 2, "domain": "boston.com", "uniques": 2, "hour": "09", "parent_category_name": "News"}, {"count": 150, "domain": "businessinsider.com", "uniques": 14, "hour": "09", "parent_category_name": "News"}, {"count": 4, "domain": "chicagotribune.com", "uniques": 3, "hour": "09", "parent_category_name": "News"}, {"count": 6, "domain": "macrumors.com", "uniques": 4, "hour": "09", "parent_category_name": "News"}, {"count": 2, "domain": "sun-sentinel.com", "uniques": 2, "hour": "09", "parent_category_name": "News"}, {"count": 82, "domain": "yourdailydish.com", "uniques": 8, "hour": "09", "parent_category_name": "News"}, {"count": 177, "domain": "businessinsider.com", "uniques": 16, "hour": "10", "parent_category_name": "News"}, {"count": 6, "domain": "chicagotribune.com", "uniques": 2, "hour": "10", "parent_category_name": "News"}, {"count": 4, "domain": "macrumors.com", "uniques": 3, "hour": "10", "parent_category_name": "News"}, {"count": 92, "domain": "yourdailydish.com", "uniques": 8, "hour": "10", "parent_category_name": "News"}, {"count": 2, "domain": "aol.com", "uniques": 2, "hour": "11", "parent_category_name": "News"}, {"count": 2, "domain": "boston.com", "uniques": 2, "hour": "11", "parent_category_name": "News"}, {"count": 153, "domain": "businessinsider.com", "uniques": 14, "hour": "11", "parent_category_name": "News"}, {"count": 8, "domain": "chicagotribune.com", "uniques": 2, "hour": "11", "parent_category_name": "News"}, {"count": 10, "domain": "macrumors.com", "uniques": 3, "hour": "11", "parent_category_name": "News"}, {"count": 78, "domain": "yourdailydish.com", "uniques": 5, "hour": "11", "parent_category_name": "News"}, {"count": 2, "domain": "boston.com", "uniques": 2, "hour": "12", "parent_category_name": "News"}, {"count": 151, "domain": "businessinsider.com", "uniques": 16, "hour": "12", "parent_category_name": "News"}, {"count": 8, "domain": "macrumors.com", "uniques": 4, "hour": "12", "parent_category_name": "News"}, {"count": 66, "domain": "yourdailydish.com", "uniques": 6, "hour": "12", "parent_category_name": "News"}, {"count": 2, "domain": "aol.com", "uniques": 2, "hour": "13", "parent_category_name": "News"}, {"count": 4, "domain": "boston.com", "uniques": 2, "hour": "13", "parent_category_name": "News"}, {"count": 134, "domain": "businessinsider.com", "uniques": 12, "hour": "13", "parent_category_name": "News"}, {"count": 28, "domain": "cnn.com", "uniques": 5, "hour": "13", "parent_category_name": "News"}, {"count": 3, "domain": "forbes.com", "uniques": 3, "hour": "13", "parent_category_name": "News"}, {"count": 2, "domain": "foxnews.com", "uniques": 2, "hour": "13", "parent_category_name": "News"}, {"count": 12, "domain": "macrumors.com", "uniques": 4, "hour": "13", "parent_category_name": "News"}, {"count": 7, "domain": "nypost.com", "uniques": 2, "hour": "13", "parent_category_name": "News"}, {"count": 17, "domain": "nytimes.com", "uniques": 2, "hour": "13", "parent_category_name": "News"}, {"count": 3, "domain": "patch.com", "uniques": 2, "hour": "13", "parent_category_name": "News"}, {"count": 42, "domain": "yourdailydish.com", "uniques": 4, "hour": "13", "parent_category_name": "News"}, {"count": 3, "domain": "aol.com", "uniques": 3, "hour": "14", "parent_category_name": "News"}, {"count": 2, "domain": "bleacherreport.com", "uniques": 2, "hour": "14", "parent_category_name": "News"}, {"count": 13, "domain": "boston.com", "uniques": 7, "hour": "14", "parent_category_name": "News"}, {"count": 139, "domain": "businessinsider.com", "uniques": 15, "hour": "14", "parent_category_name": "News"}, {"count": 6, "domain": "chicagotribune.com", "uniques": 2, "hour": "14", "parent_category_name": "News"}, {"count": 16, "domain": "cnn.com", "uniques": 4, "hour": "14", "parent_category_name": "News"}, {"count": 4, "domain": "macrumors.com", "uniques": 2, "hour": "14", "parent_category_name": "News"}, {"count": 12, "domain": "nytimes.com", "uniques": 3, "hour": "14", "parent_category_name": "News"}, {"count": 5, "domain": "realclearpolitics.com", "uniques": 2, "hour": "14", "parent_category_name": "News"}, {"count": 11, "domain": "sun-sentinel.com", "uniques": 2, "hour": "14", "parent_category_name": "News"}, {"count": 11, "domain": "usatoday.com", "uniques": 3, "hour": "14", "parent_category_name": "News"}, {"count": 25, "domain": "yourdailydish.com", "uniques": 4, "hour": "14", "parent_category_name": "News"}, {"count": 5, "domain": "boston.com", "uniques": 4, "hour": "15", "parent_category_name": "News"}, {"count": 74, "domain": "businessinsider.com", "uniques": 14, "hour": "15", "parent_category_name": "News"}, {"count": 17, "domain": "cnn.com", "uniques": 5, "hour": "15", "parent_category_name": "News"}, {"count": 2, "domain": "macrumors.com", "uniques": 2, "hour": "15", "parent_category_name": "News"}, {"count": 11, "domain": "nypost.com", "uniques": 4, "hour": "15", "parent_category_name": "News"}, {"count": 5, "domain": "theatlantic.com", "uniques": 2, "hour": "15", "parent_category_name": "News"}, {"count": 10, "domain": "weather.com", "uniques": 2, "hour": "15", "parent_category_name": "News"}, {"count": 15, "domain": "yourdailydish.com", "uniques": 4, "hour": "15", "parent_category_name": "News"}, {"count": 6, "domain": "boston.com", "uniques": 4, "hour": "16", "parent_category_name": "News"}, {"count": 129, "domain": "businessinsider.com", "uniques": 16, "hour": "16", "parent_category_name": "News"}, {"count": 12, "domain": "cnn.com", "uniques": 5, "hour": "16", "parent_category_name": "News"}, {"count": 3, "domain": "foxnews.com", "uniques": 2, "hour": "16", "parent_category_name": "News"}, {"count": 4, "domain": "macrumors.com", "uniques": 2, "hour": "16", "parent_category_name": "News"}, {"count": 5, "domain": "nytimes.com", "uniques": 2, "hour": "16", "parent_category_name": "News"}, {"count": 4, "domain": "theatlantic.com", "uniques": 2, "hour": "16", "parent_category_name": "News"}, {"count": 14, "domain": "usatoday.com", "uniques": 2, "hour": "16", "parent_category_name": "News"}, {"count": 10, "domain": "washingtontimes.com", "uniques": 2, "hour": "16", "parent_category_name": "News"}, {"count": 19, "domain": "weather.com", "uniques": 4, "hour": "16", "parent_category_name": "News"}, {"count": 85, "domain": "yourdailydish.com", "uniques": 7, "hour": "16", "parent_category_name": "News"}, {"count": 4, "domain": "boston.com", "uniques": 4, "hour": "17", "parent_category_name": "News"}, {"count": 127, "domain": "businessinsider.com", "uniques": 14, "hour": "17", "parent_category_name": "News"}, {"count": 12, "domain": "cnn.com", "uniques": 3, "hour": "17", "parent_category_name": "News"}, {"count": 15, "domain": "forbes.com", "uniques": 2, "hour": "17", "parent_category_name": "News"}, {"count": 4, "domain": "foxnews.com", "uniques": 2, "hour": "17", "parent_category_name": "News"}, {"count": 3, "domain": "inquisitr.com", "uniques": 2, "hour": "17", "parent_category_name": "News"}, {"count": 78, "domain": "lifedaily.com", "uniques": 2, "hour": "17", "parent_category_name": "News"}, {"count": 10, "domain": "macrumors.com", "uniques": 2, "hour": "17", "parent_category_name": "News"}, {"count": 3, "domain": "money.cnn.com", "uniques": 2, "hour": "17", "parent_category_name": "News"}, {"count": 9, "domain": "nypost.com", "uniques": 3, "hour": "17", "parent_category_name": "News"}, {"count": 6, "domain": "nytimes.com", "uniques": 4, "hour": "17", "parent_category_name": "News"}, {"count": 95, "domain": "yourdailydish.com", "uniques": 8, "hour": "17", "parent_category_name": "News"}, {"count": 6, "domain": "boston.com", "uniques": 3, "hour": "18", "parent_category_name": "News"}, {"count": 120, "domain": "businessinsider.com", "uniques": 14, "hour": "18", "parent_category_name": "News"}, {"count": 39, "domain": "cnn.com", "uniques": 8, "hour": "18", "parent_category_name": "News"}, {"count": 2, "domain": "forbes.com", "uniques": 2, "hour": "18", "parent_category_name": "News"}, {"count": 2, "domain": "macrumors.com", "uniques": 2, "hour": "18", "parent_category_name": "News"}, {"count": 3, "domain": "money.cnn.com", "uniques": 3, "hour": "18", "parent_category_name": "News"}, {"count": 4, "domain": "nytimes.com", "uniques": 3, "hour": "18", "parent_category_name": "News"}, {"count": 12, "domain": "weather.com", "uniques": 2, "hour": "18", "parent_category_name": "News"}, {"count": 91, "domain": "yourdailydish.com", "uniques": 6, "hour": "18", "parent_category_name": "News"}, {"count": 103, "domain": "businessinsider.com", "uniques": 13, "hour": "19", "parent_category_name": "News"}, {"count": 21, "domain": "cnn.com", "uniques": 5, "hour": "19", "parent_category_name": "News"}, {"count": 2, "domain": "huffingtonpost.com", "uniques": 2, "hour": "19", "parent_category_name": "News"}, {"count": 18, "domain": "nytimes.com", "uniques": 5, "hour": "19", "parent_category_name": "News"}, {"count": 9, "domain": "theatlantic.com", "uniques": 2, "hour": "19", "parent_category_name": "News"}, {"count": 9, "domain": "usatoday.com", "uniques": 2, "hour": "19", "parent_category_name": "News"}, {"count": 3, "domain": "wired.com", "uniques": 2, "hour": "19", "parent_category_name": "News"}, {"count": 53, "domain": "yourdailydish.com", "uniques": 7, "hour": "19", "parent_category_name": "News"}, {"count": 11, "domain": "boston.com", "uniques": 6, "hour": "20", "parent_category_name": "News"}, {"count": 72, "domain": "businessinsider.com", "uniques": 9, "hour": "20", "parent_category_name": "News"}, {"count": 20, "domain": "cnn.com", "uniques": 5, "hour": "20", "parent_category_name": "News"}, {"count": 12, "domain": "nypost.com", "uniques": 2, "hour": "20", "parent_category_name": "News"}, {"count": 7, "domain": "nytimes.com", "uniques": 4, "hour": "20", "parent_category_name": "News"}, {"count": 5, "domain": "theatlantic.com", "uniques": 2, "hour": "20", "parent_category_name": "News"}, {"count": 10, "domain": "weather.com", "uniques": 2, "hour": "20", "parent_category_name": "News"}, {"count": 30, "domain": "yourdailydish.com", "uniques": 3, "hour": "20", "parent_category_name": "News"}, {"count": 10, "domain": "boston.com", "uniques": 5, "hour": "21", "parent_category_name": "News"}, {"count": 131, "domain": "businessinsider.com", "uniques": 9, "hour": "21", "parent_category_name": "News"}, {"count": 41, "domain": "cnn.com", "uniques": 3, "hour": "21", "parent_category_name": "News"}, {"count": 8, "domain": "nytimes.com", "uniques": 4, "hour": "21", "parent_category_name": "News"}, {"count": 2, "domain": "startribune.com", "uniques": 2, "hour": "21", "parent_category_name": "News"}, {"count": 32, "domain": "yourdailydish.com", "uniques": 3, "hour": "21", "parent_category_name": "News"}, {"count": 11, "domain": "boston.com", "uniques": 5, "hour": "22", "parent_category_name": "News"}, {"count": 113, "domain": "businessinsider.com", "uniques": 8, "hour": "22", "parent_category_name": "News"}, {"count": 9, "domain": "cbsnews.com", "uniques": 2, "hour": "22", "parent_category_name": "News"}, {"count": 13, "domain": "cnn.com", "uniques": 3, "hour": "22", "parent_category_name": "News"}, {"count": 24, "domain": "yourdailydish.com", "uniques": 4, "hour": "22", "parent_category_name": "News"}, {"count": 10, "domain": "aol.com", "uniques": 2, "hour": "23", "parent_category_name": "News"}, {"count": 5, "domain": "boston.com", "uniques": 3, "hour": "23", "parent_category_name": "News"}, {"count": 120, "domain": "businessinsider.com", "uniques": 11, "hour": "23", "parent_category_name": "News"}, {"count": 10, "domain": "cnn.com", "uniques": 2, "hour": "23", "parent_category_name": "News"}, {"count": 2, "domain": "forbes.com", "uniques": 2, "hour": "23", "parent_category_name": "News"}, {"count": 5, "domain": "nytimes.com", "uniques": 2, "hour": "23", "parent_category_name": "News"}, {"count": 5, "domain": "realclearpolitics.com", "uniques": 2, "hour": "23", "parent_category_name": "News"}, {"count": 33, "domain": "yourdailydish.com", "uniques": 4, "hour": "23", "parent_category_name": "News"}, {"count": 6, "domain": "reddit.com", "uniques": 2, "hour": "23", "parent_category_name": "Online Communities"}, {"count": 6, "domain": "zillow.com", "uniques": 2, "hour": "11", "parent_category_name": "Real Estate"}, {"count": 5, "domain": "zillow.com", "uniques": 2, "hour": "12", "parent_category_name": "Real Estate"}, {"count": 8, "domain": "zillow.com", "uniques": 2, "hour": "15", "parent_category_name": "Real Estate"}, {"count": 4, "domain": "zillow.com", "uniques": 2, "hour": "16", "parent_category_name": "Real Estate"}, {"count": 7, "domain": "zillow.com", "uniques": 2, "hour": "18", "parent_category_name": "Real Estate"}, {"count": 7, "domain": "timeanddate.com", "uniques": 2, "hour": "13", "parent_category_name": "Reference & Language"}, {"count": 7, "domain": "ebay.com", "uniques": 2, "hour": "00", "parent_category_name": "Shopping"}, {"count": 24, "domain": "slickdeals.net", "uniques": 2, "hour": "01", "parent_category_name": "Shopping"}, {"count": 2, "domain": "walmart.com", "uniques": 2, "hour": "02", "parent_category_name": "Shopping"}, {"count": 3, "domain": "walmart.com", "uniques": 2, "hour": "04", "parent_category_name": "Shopping"}, {"count": 2, "domain": "walmart.com", "uniques": 2, "hour": "10", "parent_category_name": "Shopping"}, {"count": 10, "domain": "target.com", "uniques": 3, "hour": "12", "parent_category_name": "Shopping"}, {"count": 3, "domain": "walmart.com", "uniques": 3, "hour": "12", "parent_category_name": "Shopping"}, {"count": 2, "domain": "target.com", "uniques": 2, "hour": "13", "parent_category_name": "Shopping"}, {"count": 9, "domain": "ebay.com", "uniques": 2, "hour": "14", "parent_category_name": "Shopping"}, {"count": 8, "domain": "kohls.com", "uniques": 2, "hour": "14", "parent_category_name": "Shopping"}, {"count": 13, "domain": "kohls.com", "uniques": 2, "hour": "15", "parent_category_name": "Shopping"}, {"count": 3, "domain": "walmart.com", "uniques": 2, "hour": "15", "parent_category_name": "Shopping"}, {"count": 2, "domain": "slickdeals.net", "uniques": 2, "hour": "16", "parent_category_name": "Shopping"}, {"count": 17, "domain": "target.com", "uniques": 4, "hour": "16", "parent_category_name": "Shopping"}, {"count": 11, "domain": "walmart.com", "uniques": 3, "hour": "16", "parent_category_name": "Shopping"}, {"count": 15, "domain": "jcpenney.com", "uniques": 3, "hour": "18", "parent_category_name": "Shopping"}, {"count": 2, "domain": "kohls.com", "uniques": 2, "hour": "18", "parent_category_name": "Shopping"}, {"count": 2, "domain": "walmart.com", "uniques": 2, "hour": "18", "parent_category_name": "Shopping"}, {"count": 21, "domain": "ebay.com", "uniques": 2, "hour": "19", "parent_category_name": "Shopping"}, {"count": 2, "domain": "sears.com", "uniques": 2, "hour": "19", "parent_category_name": "Shopping"}, {"count": 3, "domain": "walmart.com", "uniques": 2, "hour": "19", "parent_category_name": "Shopping"}, {"count": 2, "domain": "walmart.com", "uniques": 2, "hour": "20", "parent_category_name": "Shopping"}, {"count": 9, "domain": "ebay.com", "uniques": 2, "hour": "21", "parent_category_name": "Shopping"}, {"count": 5, "domain": "walmart.com", "uniques": 3, "hour": "22", "parent_category_name": "Shopping"}, {"count": 36, "domain": "ebay.com", "uniques": 3, "hour": "23", "parent_category_name": "Shopping"}], "logic": "and", "categories": ["Arts & Entertainment", "Beauty & Personal Care", "Business & Industry", "Computers & Electronics", "Finance", "Food & Drink", "Health", "Internet & Telecom", "News", "Online Communities", "Real Estate", "Reference & Language", "Shopping"]}

        # Get default advertiser settings
        sql = "SELECT * FROM advertiser_adwords WHERE advertiser_id = %d" % (int(advertiser_id))
        df = self.db.select_dataframe(sql)

        if(len(df) == 0):
            self.write('User could not be found')
            self.finish()

        advertiser = {
            'advertiser_id': df.ix[0]['advertiser_id'],
            'account_id': df.ix[0]['account_id'],
            'settings': {
                'budget_id': df.ix[0]['budget_id'],
                'impressions': df.ix[0]['impressions'],
                'bid_amount': df.ix[0]['bid_amount'],
                'url': df.ix[0]['url'],
                'headline': df.ix[0]['headline'],
                'description1': df.ix[0]['description1'],
                'description2': df.ix[0]['description2']
            }
        }

        for category in hindsight_data['categories'][0:3]:
            # Create campaign
            campaign_input = {
                'name': 'AI Campaign - %s' % category,
                'budget_id': advertiser['settings']['budget_id'],
                'impressions': advertiser['settings']['impressions'],
                'category': category
            }
            campaign = AdWords().Campaign.create(campaign_input)

            # Set schedule
            schedule_input = {
                'campaign_id': campaign['id'],
                'mediaplan': hindsight_data['mediaplan'],
                'category': category
            }
            schedule = AdWords().Schedule.set(schedule_input)

            # Create adgroup
            adgroup_input = {
                'campaign_id': campaign['id'],
                'adgroup_name': 'AI AdGroup',
                'bid_amount': advertiser['settings']['bid_amount']
            }
            adgroup = AdWords().AdGroup.create(adgroup_input)
            
            # Set keyword
            # keyword = AdWords().Keyword.set(adgroup)

            # Set placement
            placement_input = {
                'adgroup_id': adgroup['id'],
                'mediaplan': hindsight_data['mediaplan'],
                'category': category
            }
            placement = AdWords().Placement.set(placement_input)

            # Set vertical
                # vertical = AdWords().Vertical.set(adgroup)

            # Create ad
            ad_input = {
                'adgroup_id': adgroup['id'],
                'final_url': advertiser['settings']['url'],
                'display_url': advertiser['settings']['url'],
                'headline': advertiser['settings']['headline'],
                'description1': advertiser['settings']['description1'],
                'description2': advertiser['settings']['description2']
            }
            ad = AdWords().Ad.create(ad_input)
        
            sql = "INSERT INTO `advertiser_adwords_campaign` (`campaign_id`, `advertiser_id`, `category`, `adgroup_id`, `ad_id`, `ts_created`) VALUES ('%(campaign_id)s', '%(advertiser_id)s', '%(category)s', '%(adgroup_id)s', '%(ad_id)s', NOW());" % {
                'campaign_id': campaign['id'],
                'advertiser_id': advertiser_id,
                'category': category,
                'adgroup_id': adgroup['id'],
                'ad_id': ad['id']
            }
            df = self.db.execute(sql)

        self.write('Success! <3')


        
        

class WebApp(web.Application):
    def __init__(self):
        db = lnk.dbs.rockerbox
        connectors = {'db': db}

        handlers = [
            (r'/', IndexHandler, connectors),
            (r'/authorize', AuthorizeHandler, connectors),
            (r'/callback', CallbackHandler, connectors),
            (r'/campaign', CampaignHandler, connectors),
            (r'/campaign/([0-9]+)/schedule', ScheduleHandler, connectors),
            (r'/report', ReportHandler, connectors),
            (r'/account', AccountHandler, connectors),
            (r'/ad', AdHandler, connectors),
            (r'/adgroup', AdGroupHandler, connectors),
            (r'/adgroup/([0-9]+)/keyword', KeywordHandler, connectors),
            (r'/adgroup/([0-9]+)/placement', PlacementHandler, connectors),
            (r'/adgroup/([0-9]+)/vertical', VerticalHandler, connectors),
            (r'/manage', ManageHandler, connectors),
            (r'/customer', CustomerHandler, connectors),
            (r'/budget', BudgetHandler, connectors)
        ]

        settings = dict(
            static_path='static',
            cookie_secret='rickotoole',
            debug=True
        )

        super(WebApp, self).__init__(handlers, **settings)


def main():
    logging.basicConfig(level=logging.INFO)
    app = WebApp()
    server = httpserver.HTTPServer(app)
    server.listen(9001, '0.0.0.0')
    logging.info('Serving at http://0.0.0.0:8888')
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info('Interrupted...')
    finally:
        pass


if __name__ == '__main__':
    main()
