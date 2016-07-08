import tornado.ioloop
from tornado import httpserver
from tornado import web

import oauth2client
import json
import time
import logging
import os

import slack_auth
import urllib,urllib2
import MySQLdb, MySQLdb.cursors

db = MySQLdb.connect(user='will_test', passwd='will_test', host='162.243.1.73', db='slack_integration', cursorclass=MySQLdb.cursors.DictCursor)
cur = db.cursor()

def getUser(user_id):
    sql = "SELECT user_id, global_access_token, bot_access_token, team_id, channel_id, bot_id FROM users WHERE user_id = %(user_id)s"
    cur.execute(sql, { 'user_id': user_id })
    result = cur.fetchall()

    if not result:
        response = False
    else:
        response = result[0]

    return response

def apivalidation(x):
    return x

class IndexHandler(web.RequestHandler):
    def get(self):
        self.write('<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot&client_id=2171079607.55132364375"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>')
        self.finish()

class AuthenticationCallbackHandler(web.RequestHandler):
    def get(self):
        code = self.get_argument('code','')
        user_id = self.get_secure_cookie('advertiser')
        user = getUser(user_id)

        # Get token
        url = 'https://slack.com/api/oauth.access?client_id=2171079607.55132364375&client_secret=0e20a11476346eed760868156c215214&redirect_uri=http://192.168.99.100:8888/authenticate/callback&code=' + code
        req = urllib2.Request(url)
        res = urllib2.urlopen(req)
        data = json.loads(res.read())

        if(data['ok'] == True):
            channel_id = data['incoming_webhook']['channel_id']
            bot_id = data['bot']['bot_user_id']
            bot_access_token = data['bot']['bot_access_token']
            global_access_token = data['access_token']
            team_id = data['team_id']

            if not user:
                # New user
                sql = "INSERT INTO `users` (`user_id`, `global_access_token`, `bot_access_token`, `team_id`, `channel_id`, `bot_id`, `ts_created`) VALUES (%(user_id)s, %(global_access_token)s, %(bot_access_token)s, %(team_id)s, %(channel_id)s, %(bot_id)s, NOW())"
            else:
                # Existing user
                sql = "UPDATE `users` SET `global_access_token` = %(global_access_token)s, `bot_access_token` = %(bot_access_token)s, `team_id` = %(team_id)s, `channel_id` = %(channel_id)s, `bot_id` = %(bot_id)s WHERE `user_id` = %(user_id)s"

            try:
                cur.execute(sql, {
                    "user_id": user_id,
                    "global_access_token": global_access_token,
                    "bot_access_token": bot_access_token,
                    "team_id": team_id,
                    "channel_id": channel_id,
                    "bot_id": bot_id
                })
                db.commit()
                self.write('Redirect to success page here')
            except(e):
                self.write('Redirect to error page here (DB error)')
                self.write(e)
        else:
            self.write('Redirect to error page here (Slack error)')

        self.finish()

class SlackChannelsHandler(web.RequestHandler):
    @apivalidation
    def get(self):
        self.set_header('Content-Type', 'application/json; charset=UTF-8')

        user_id = self.get_argument('user_id', '')
        user = getUser(user_id)

        if not user:
            response = json.dumps({
                'ok': False,
                'message': 'User does not exist or does not have Slack integration.'
            })
        else:
            url = 'https://slack.com/api/channels.list?token=' + user['bot_access_token']
            req = urllib2.Request(url)
            res = urllib2.urlopen(req)
            response = json.loads(res.read())

        self.write(response)
        self.finish()

class SlackMessageHandler(web.RequestHandler):
    @apivalidation
    def post(self):
        self.set_header('Content-Type', 'application/json; charset=UTF-8')

        user_id = self.get_argument('user_id','')
        user = getUser(user_id)

        if not user:
            response = json.dumps({
                'ok': False,
                'message': 'User does not exist or does not have Slack integration.'
            })
        else:
            articles = []
            for article in json.loads(self.get_argument('articles','')):
                i = len(articles) + 1

                articles.append({
                    "title": "",
                    "value": "<%s|%d. %s>" % (article['url'], i, article['title']),
                    "short": False
                })

            data = urllib.urlencode({
                'channel': user['channel_id'],
                'token': user['bot_access_token'],
                'text': '',
                "attachments": json.dumps([{
                    "fallback": "Top articles for today.",
                    "color": "#3195c6",
                    "pretext": "These are your top articles for today. Sign into Hindsight for more articles!",
                    "author_name": "Hindsight by Rockerbox",
                    "author_link": "http://rockerbox.com/hindsight/",
                    "author_icon": "http://flickr.com/icons/bobby.jpg",
                    "text": "",
                    "fields": articles,
                    "image_url": "http://my-website.com/path/to/image.jpg",
                    "thumb_url": "http://example.com/path/to/thumb.png",
                    "footer": "Hindsight by Rockerbox",
                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                    "ts": time.time()
                }])
            })
            url = 'https://slack.com/api/chat.postMessage'
            req = urllib2.Request(url, data)
            res = urllib2.urlopen(req)

            data = json.loads(res.read())

            self.write(json.dumps(data))

        self.finish()

class WebApp(web.Application):

    def __init__(self):
        handlers = [
            (r"/authenticate/callback", AuthenticationCallbackHandler),
            (r"/slack/channels", SlackChannelsHandler),
            (r"/slack/message", SlackMessageHandler),
            (r"/", IndexHandler),
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
    logging.info("Serving at http://0.0.0.0:8888")
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        logging.info("Interrupted...")
    finally:
        pass


if __name__ == '__main__':
    main()
