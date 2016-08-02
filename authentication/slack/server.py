import tornado.ioloop
from tornado import httpserver
from tornado import web

import json
import time
import logging
import os
import urllib,urllib2

from link import lnk

secrets_path = os.path.abspath('../authentication/slack/secrets.json');
with open(secrets_path) as data_file:
    SETTINGS = json.load(data_file)

def build_link_track(to, link, event="slack - digest (click)"):
    import ujson
    import urllib
    j = {
        "event": event,
        "properties": {
            "distinct_id": to,
            "token": "a48368904183cf405deb90881e154bd8",
            "link": link,
            "campaign": "digest"
        }
    }
    _j = ujson.dumps(j).encode("base64").replace("\n","")
    src = "http://api.mixpanel.com/track/?data=%s&redirect=%s&ip=1" % (_j,urllib.quote_plus(link))
    return src

class DBQuery:
    def getUser(self, advertiser_id):
        sql = "SELECT advertiser_id, global_access_token, bot_access_token, team_id, channel_id, bot_id FROM advertiser_slack WHERE advertiser_id = %d" % (int(advertiser_id))
        df = self.db.select_dataframe(sql)

        if(len(df) == 0):
            return {
                'empty': True
            }

        return {
            'empty': False,
            'advertiser_id': df.ix[0]['advertiser_id'],
            'global_access_token': df.ix[0]['global_access_token'],
            'bot_access_token': df.ix[0]['bot_access_token'],
            'team_id': df.ix[0]['team_id'],
            'channel_id': df.ix[0]['channel_id'],
            'bot_id': df.ix[0]['bot_id']
        }

    def getAdvertiserEmail(self, advertiser_id):
        sql = 'SELECT * FROM user WHERE advertiser_id = %d LIMIT 0,1' % int((advertiser_id))
        df = self.db.select_dataframe(sql)
        return df.ix[0]['email']

def apivalidation(x):
    def fn(self):
        self.set_header('Content-Type', 'application/json; charset=UTF-8')
        return x(self)
    return fn

class IndexHandler(web.RequestHandler):
    def get(self):
        self.write('<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot&client_id=2171079607.55132364375"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>')
        self.finish()

class AuthenticationCallbackHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    def get(self):
        if(self.get_secure_cookie('advertiser') == None):
            self.redirect(self.request.host)

        code = self.get_argument('code','')
        advertiser_id = self.get_secure_cookie('advertiser')
        user = DBQuery.getUser(self, advertiser_id)

        # Get token
        url = '%s?client_id=%s&client_secret=%s&redirect_uri=%s&code=%s' % (SETTINGS['slack']['token_uri'], SETTINGS['slack']['client_id'], SETTINGS['slack']['client_secret'], SETTINGS['slack']['redirect_uri'], code)
        req = urllib2.Request(url)
        res = urllib2.urlopen(req)
        data = json.loads(res.read())

        if(data['ok'] == True):
            channel_id = data['incoming_webhook']['channel_id']
            bot_id = data['bot']['bot_user_id']
            bot_access_token = data['bot']['bot_access_token']
            global_access_token = data['access_token']
            team_id = data['team_id']

            if user['empty'] == False:
                # Existing user
                sql = "UPDATE `advertiser_slack` SET `global_access_token` = '%s', `bot_access_token` = '%s', `team_id` = '%s', `channel_id` = '%s', `bot_id` = '%s' WHERE `advertiser_id` = '%s'" % (global_access_token, bot_access_token, team_id, channel_id, bot_id, advertiser_id)
            else:
                # New user
                sql = "INSERT INTO `advertiser_slack` (`advertiser_id`, `global_access_token`, `bot_access_token`, `team_id`, `channel_id`, `bot_id`, `ts_created`) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', NOW())" % (advertiser_id, global_access_token, bot_access_token, team_id, channel_id, bot_id)

            try:
                df = self.db.execute(sql)

                self.redirect(SETTINGS['redirect']['success'])
            except(e):
                self.redirect(SETTINGS['redirect']['error'])
        else:
            self.redirect(SETTINGS['redirect']['error'])

        self.finish()

class SlackChannelsHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    @apivalidation
    def get(self):
        advertiser_id = self.get_argument('advertiser_id', '')
        user = DBQuery.getUser(self, advertiser_id)

        if user['empty'] == False:
            url = 'https://slack.com/api/channels.list?token=%s' %  user['bot_access_token']
            req = urllib2.Request(url)
            res = urllib2.urlopen(req)
            response = json.loads(res.read())
        else:
            response = json.dumps({
                'ok': False,
                'message': 'Advertiser does not exist or does not have Slack integration.'
            })

        self.write(response)
        self.finish()

class SlackMessageHandler(web.RequestHandler, DBQuery):
    def initialize(self, db):
        self.db = db

    @apivalidation
    def post(self):
        post_data = json.loads(self.request.body)
        advertiser_id = post_data['advertiser_id']
        user = DBQuery.getUser(self, advertiser_id)
        advertiser_email = DBQuery.getAdvertiserEmail(self, advertiser_id)

        if user['empty'] == False:
            articles = []
            for article in post_data['articles']:
                i = len(articles) + 1

                articles.append({
                    "title": "",
                    "value": "<%s|%d. %s>" % (build_link_track(advertiser_email, article['url']), i, article['title']),
                    "short": False
                })

            data = urllib.urlencode({
                'channel': user['channel_id'],
                'token': user['bot_access_token'],
                'text': '',
                'attachments': json.dumps([{
                    'fallback': 'Top articles for today.',
                    'color': '#3195c6',
                    'pretext': 'These are your top articles for today. Sign into Hindsight for more articles!',
                    'author_name': 'Hindsight by Rockerbox',
                    'author_link': 'http://rockerbox.com/hindsight/',
                    'author_icon': 'http://flickr.com/icons/bobby.jpg',
                    'text': '',
                    'fields': articles,
                    'footer': 'Hindsight by Rockerbox',
                    'footer_icon': 'https://platform.slack-edge.com/img/default_application_icon.png',
                    'ts': time.time()
                }])
            })
            url = 'https://slack.com/api/chat.postMessage'
            req = urllib2.Request(url, data)
            res = urllib2.urlopen(req)

            data = json.loads(res.read())

            self.write(json.dumps(data))
        else:
            response = json.dumps({
                'ok': False,
                'message': 'Advertiser does not exist or does not have Slack integration.'
            })

        self.finish()

class WebApp(web.Application):

    def __init__(self):
        db = lnk.dbs.rockerbox
        connectors = {"db": db}

        handlers = [
            (r'/callback', AuthenticationCallbackHandler, connectors),
            (r'/channels', SlackChannelsHandler, connectors),
            (r'/message', SlackMessageHandler, connectors),
            (r'/', IndexHandler),
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
    logging.info("Serving at http://0.0.0.0:8888")
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info("Interrupted...")
    finally:
        pass


if __name__ == '__main__':
    main()
