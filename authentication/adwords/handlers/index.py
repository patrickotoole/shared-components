import ujson
from tornado import web
import tornado
from adwords import AdWords

QUERY = "select status from advertiser_adwords where advertiser_id = %s"

class IndexHandler(tornado.web.RequestHandler):
    def initialize(self, **kwargs):
        self.db = kwargs.get('db',None)
        self.adwords = kwargs.get('adwords',None)

    def check_db(self,advertiser_id):
        import ipdb; ipdb.set_trace()
        df = self.db.select_dataframe(QUERY % advertiser_id)
        if len(df) > 0:
            resp = df['status'][0]
        else:
            resp = None
        return resp

    def get(self):
        auth_uri = self.adwords.RB.flow.step1_get_authorize_url()
        advertiser_id = self.get_secure_cookie('advertiser')
        self.write('You are currently logged in with advertiser id %s' % advertiser_id)
        self.write("<br>")
        status = self.check_db(advertiser_id)
        if status:
            self.write("You're current status is %s" % status)
            self.finish()
        else:
            self.write('<a href="/authorize" style="display: inline-block; border: solid 1px #e0e0e0; background-color: #fafafa; line-height: 24px; padding: 8px; border-radius: 3px; color: #666; text-decoration: none; font-family: sans-serif; font-size: 14px;"><svg style="display: inline-block; float: left; margin-right: 5px;" version="1.1" id="Layer_3" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="24px" viewBox="0 -180 20 80" xml:space="preserve"><g><path fill="#0F9D59" d="M26.864-100.747l17.997,0.003l-0.018-0.041l-24.577-73.752v70.98C21.937-101.833,24.266-100.747,26.864-100.747"></path><path fill="#0A6E3D" d="M7.903-137.693l10.271,30.826c0.003,0.006,0.003,0.012,0.006,0.023c0.448,1.251,1.172,2.355,2.077,3.29v-70.978l-0.026-0.07L7.903-137.693z"></path><path fill="#4284F4" d="M-4.419-174.604l-0.006,0.026l-0.009-0.026l-24.604,73.822l-0.018,0.038h17.997c2.596,0,4.928-1.081,6.601-2.818c0.902-0.932,1.626-2.036,2.074-3.287c0.003-0.012,0.003-0.018,0.006-0.018l22.614-67.746H-4.425v0.009H-4.419z"></path></g></svg>Connect with AdWords</a>')
            self.finish()
