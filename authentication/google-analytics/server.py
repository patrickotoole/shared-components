import tornado.ioloop
from tornado import httpserver
from tornado import web
from oauth2client import client
from apiclient.discovery import build
import httplib2
import json
import logging
from link import lnk
import os

secrets_path = os.path.abspath('../authentication/google-analytics/secrets.json');

flow = client.flow_from_clientsecrets(
    secrets_path,
    scope='https://www.googleapis.com/auth/analytics.readonly',
    redirect_uri='http://ga-dev.rockerbox.com:8888/callback')
flow.params['access_type'] = 'offline'

class DBQuery:
    def saveAdvertiser(self, credentials_json):
        advertiser_id = self.get_secure_cookie('advertiser')

        sql = "INSERT INTO `advertiser_ga` (`advertiser_id`, `view_id`, `token`, `ts_created`) VALUES (%(advertiser_id)d, %(view_id)d, '%(token)s', NOW())" % {
            'advertiser_id': int(advertiser_id),
            'view_id': int(0),
            'token': json.dumps(credentials_json)
        }

        try:
            df = self.db.execute(sql)
            response = {
                'status': 'success',
                'message': 'User is saved in database.'
            }
        except:
            response = {
                'status': 'error',
                'message': 'Something went wrong while writing to database.'
            }

        return response

    def getAdvertiser(self, advertiser_id):
        sql = "SELECT * FROM `advertiser_ga` WHERE `advertiser_id` = %s LIMIT 0,1" % (advertiser_id)

        try:
            df = self.db.select_dataframe(sql)
            response = {
                'view_id': df.ix[0]['view_id'],
                'token': df.ix[0]['token'][1:-1]
            }
        except:
            response = {
                'status': 'error',
                'message': 'Something went wrong while fetching the user from the db.'
            }

        return response

    def getAnalytics(self, advertiser, date, url):
        credentials = advertiser['token']
        view_id = advertiser['view_id']

        credentials = client.OAuth2Credentials.new_from_json(credentials)

        http = httplib2.Http()
        http = credentials.authorize(http)

        analytics = build('analytics', 'v4', http=http, discoveryServiceUrl='https://analyticsreporting.googleapis.com/$discovery/rest')

        data = analytics.reports().batchGet(
            body = {
                'reportRequests': [
                    {
                        'viewId': str(view_id),
                        'dateRanges': [
                            {
                                'startDate': date,
                                'endDate': date
                            }
                        ],
                        'dimensions': [{'name': 'ga:segment'}],
                        'metrics': [{'expression': 'ga:users'}, {'expression': 'ga:sessions'}, {'expression': 'ga:hits'}],
                        'segments': [
                            {
                            'dynamicSegment':
                                {
                                    'name': 'Visitors',
                                    'userSegment': {
                                        'segmentFilters': [{
                                            'simpleSegment': {
                                                'orFiltersForSegment': [{
                                                    'segmentFilterClauses': [{
                                                        'dimensionFilter': {
                                                            'dimensionName': 'ga:pagePath',
                                                            'operator': 'EXACT',
                                                            'expressions': [url]
                                                        }
                                                    }]
                                                }]
                                            }
                                        }]
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        ).execute()

        clean = []
        i = 0
        for metric in data['reports'][0]['columnHeader']['metricHeader']['metricHeaderEntries']:
            clean.append({
                'name': metric['name'],
                'value': data['reports'][0]['data']['totals'][0]['values'][i]
            })
            i = i + 1

        return clean


class IndexHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        auth_uri = flow.step1_get_authorize_url()
        self.redirect(auth_uri)


class PropertiesHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        advertiser = DBQuery.getAdvertiser(self, advertiser_id)

        credentials = advertiser['token']
        credentials = client.OAuth2Credentials.new_from_json(credentials)

        http = httplib2.Http()
        http = credentials.authorize(http)

        req, res = http.request('https://www.googleapis.com/analytics/v3/management/accountSummaries', 'GET')
        summary = json.loads(res)

        properties = []
        for property in summary['items'][0]['webProperties']:
            for profile in property['profiles']:
                properties.append({
                    'id': profile['id'],
                    'name': '%s - %s' % (property['name'], profile['name'])
                })
        self.write(json.dumps(properties))
        self.finish()

    def post(self):
        post_data = json.loads(self.request.body)

        view_id = post_data['view_id']
        advertiser_id = post_data['advertiser_id']

        sql = "UPDATE `advertiser_ga` SET `view_id` = '%d' WHERE `advertiser_id` = '%d'" % (view_id, advertiser_id)

        try:
            df = self.db.execute(sql)
            self.write({
                'status': 'success',
                'message': 'View ID successfully updated'
            })
        except:
            self.write({
                'status': 'error',
                'message': 'Something went wrong while updating view_id.'
            })

        self.finish()

class CallbackHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        code = self.get_argument('code', False)

        # If code doesn't exist, redirect to /
        if code == False:
            self.redirect('/')
            return

        credentials = flow.step2_exchange(code)
        credentials_json = credentials.to_json()

        DBQuery.saveAdvertiser(self, credentials_json)
        self.write(credentials_json)

        self.finish()


class DataHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        advertiser = DBQuery.getAdvertiser(self, advertiser_id)

        date = self.get_argument('date', False)
        url = self.get_argument('url', False)

        if date == False or url == False:
            error = {
                'status': 'error',
                'message': 'You need to specify both a DATE as well as URL'
            }
            self.write(json.dumps(error))
            return

        try:
            response = DBQuery.getAnalytics(self, advertiser, date, url)
        except:
            response = {
                'status': 'error',
                'message': 'Something unexpected went wrong.'
            }

        self.write(json.dumps(response))
        self.finish()


class WebApp(web.Application):

    def __init__(self):
        db = lnk.dbs.rockerbox
        connectors = {'db': db}

        handlers = [
            (r'/', IndexHandler, connectors),
            (r'/callback', CallbackHandler, connectors),
            (r'/properties', PropertiesHandler, connectors),
            (r'/data', DataHandler, connectors)
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
    server.listen(8888, '0.0.0.0')
    logging.info('Serving at http://0.0.0.0:8888')
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info('Interrupted...')
    finally:
        pass


if __name__ == '__main__':
    main()
