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
    redirect_uri='http://hindsight.getrockerbox.com/integrations/googleanalytics/callback')
flow.params['access_type'] = 'offline'

class DBQuery:
    def saveAdvertiser(self, credentials_json):
        sql = "INSERT INTO `advertiser_ga` (`user_id`, `view_id`, `token`, `ts_created`) VALUES (NULL, %(view_id)d, '%(token)s', NOW());" % {
            'view_id': int(0),
            'token': json.dumps(credentials_json)
        }

        try:
            user_id = self.db.execute(sql)
            response = {
                'status': 'success',
                'message': 'User is saved in database.',
                'user_id': user_id
            }
        except:
            response = {
                'status': 'error',
                'message': 'Something went wrong while writing to database.'
            }

        return response

    def getAdvertiser(self, user_id):
        sql = "SELECT * FROM `advertiser_ga` WHERE `user_id` = %s LIMIT 0,1" % (user_id)

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

    def getAnalytics(self, advertiser, date, url, view_id):
        credentials = advertiser['token']

        credentials = client.OAuth2Credentials.new_from_json(credentials)

        http = httplib2.Http()
        http = credentials.authorize(http)

        analytics = build('analytics', 'v4', http=http, discoveryServiceUrl='https://analyticsreporting.googleapis.com/$discovery/rest')

        if '/' in date:
            date = date.split('/')
            start_date = date[0]
            end_date = date[1]
        else:
            start_date = date
            end_date = date

        data = analytics.reports().batchGet(
            body = {
                'reportRequests': [
                    {
                        'viewId': str(view_id),
                        'dateRanges': [{
                            'startDate': start_date,
                            'endDate': end_date
                        }],
                        'dimensions': [{'name': 'ga:segment'}, {'name': 'ga:pagePath'}, {'name': 'ga:date'}],
                        'metrics': [{'expression': 'ga:users'}, {'expression': 'ga:sessions'}, {'expression': 'ga:hits'}, {'expression': 'ga:goalCompletionsAll'}],
                        'includeEmptyRows': 'true',
                        'orderBys': [{'fieldName': 'ga:users', 'sortOrder': 'DESCENDING'}],
                        'segments': [{
                            'dynamicSegment': {
                                'name': 'Users / Sessions / Hits / Goal completions',
                                'userSegment': {
                                    'segmentFilters': [{
                                        'simpleSegment': {
                                            'orFiltersForSegment': [{
                                                'segmentFilterClauses': [{
                                                    'dimensionFilter': {
                                                        'dimensionName': 'ga:pagePath',
                                                        'operator': 'PARTIAL',
                                                        'expressions': [url]
                                                    }
                                                }]
                                            }]
                                        }
                                    }]
                                }
                            }
                        }]
                    }
                ]
            }
        ).execute()

        return data


class IndexHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        user_id = self.get_secure_cookie('user_id', None)

        if user_id == None:
            self.write('<a href="/authorize">Authorize</a>')
        else:
            self.render('report.html')


class AuthorizeHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        auth_uri = flow.step1_get_authorize_url()
        self.redirect(auth_uri)


class SignoutHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        self.clear_cookie('user_id')
        self.redirect('/')


class PropertiesHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        user_id = self.get_secure_cookie('user_id')
        advertiser = DBQuery.getAdvertiser(self, user_id)

        credentials = advertiser['token']
        credentials = client.OAuth2Credentials.new_from_json(credentials)

        http = httplib2.Http()
        http = credentials.authorize(http)

        req, res = http.request('https://www.googleapis.com/analytics/v3/management/accountSummaries', 'GET')
        summary = json.loads(res)

        properties = []
        for item in summary['items']:
            for property in item['webProperties']:
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
        user_id = post_data['user_id']

        sql = "UPDATE `advertiser_ga` SET `view_id` = '%d' WHERE `user_id` = '%d'" % (view_id, user_id)

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

        user = DBQuery.saveAdvertiser(self, credentials_json)
        if(user['status'] == 'success'):
            user_id = json.dumps(user['user_id'])
            self.set_secure_cookie('user_id', user_id)
            self.redirect('/')
        else:
            self.redirect('/?error=1')

        self.finish()


class DataHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        user_id = self.get_secure_cookie('user_id')
        advertiser = DBQuery.getAdvertiser(self, user_id)

        date = self.get_argument('date', False)
        url = self.get_argument('url', False)
        view_id = self.get_argument('view_id', False)

        if url == False:
            url = '/'

        if date == False:
            error = {
                'status': 'error',
                'message': 'You need to specify a date (2016-08-15) or date range (2016-08-01/2016-08-15).'
            }
            self.write(json.dumps(error))
            return

        try:
            response = DBQuery.getAnalytics(self, advertiser, date, url, view_id)
        except:
            response = {
                'status': 'error',
                'message': 'Something unexpected went wrong.'
            }

        self.write(response)
        self.finish()


class WebApp(web.Application):

    def __init__(self):
        db = lnk.dbs.rockerbox
        connectors = {'db': db}

        handlers = [
            (r'/', IndexHandler, connectors),
            (r'/authorize', AuthorizeHandler, connectors),
            (r'/callback', CallbackHandler, connectors),
            (r'/signout', SignoutHandler, connectors),
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
