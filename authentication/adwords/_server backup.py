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
from tornado import httpserver
from tornado import web
from adwords import AdWords


class IndexHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        auth_uri = flow.step1_get_authorize_url()
        advertiser_id = self.get_secure_cookie('advertiser')
        self.write('You are currently logged in with advertiser id %s' % advertiser_id)
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
        sql = "INSERT INTO `advertiser_adwords` (`advertiser_id`, `token`, `ts_created`) VALUES ('%(advertiser_id)s', '%(token)s', NOW()) ON DUPLICATE KEY UPDATE token='%(token)s';" % {
            'advertiser_id': advertiser_id,
            'token': credentials.to_json()
        }
        df = self.db.execute(sql)

        self.write(sql)


class AccountHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    # List
    def get(self):
        adwords_client = getAdwordsClient(manager=True)

        # Initialize appropriate service.
        managed_customer_service = adwords_client.GetService('ManagedCustomerService', version='v201607')

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

        self.write(response)

    # Create
    def post(self):
        adwords_client = getAdwordsClient(True)

        managed_customer_service = adwords_client.GetService('ManagedCustomerService', version='v201607')

        today = datetime.datetime.today().strftime('%Y%m%d %H:%M:%S')
        operations = [{
            'operator': 'ADD',
            'operand': {
                'name': 'Rockerbox AI Trader',
                'currencyCode': 'USD',
                'dateTimeZone': 'America/New_York',
            }
        }]

        accounts = managed_customer_service.mutate(operations)


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
        adwords_client = getAdwordsClient()

        name = '%s #%s' % (post_data['name'], uuid.uuid4())
        amount = str(post_data['amount'])

        budget_service = adwords_client.GetService('BudgetService', version='v201607')

        budget = {
            'name': name,
            'amount': {
                'microAmount': amount
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

        self.write(response)

# adwords = {
#     'campaign': {
#         'create': 
#     }
# }


class ManageHandler(web.RequestHandler):
    def initialize(self, db):
        self.db = db

    def get(self):
        test = AdWords().Campaign.read()
        self.write(test)


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
