import tornado.web
import ujson
import functools
from twisted.internet import defer
from tornado.httpclient import *
from lib.helpers import *

class BatchSubmitHandler(tornado.web.RequestHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db
        self.api = api

    def get(self):
        self.write("Here")

    def post(self):
        data = ujson.loads(self.request.body)
        print data
        self.submit_batch_segments(data)

    @decorators.deferred
    @decorators.rate_limited
    def get_new_job(self):
        r = self.api.post("/batch-segment")
        return r.json

    # Given a string of uid,segment:expiration data, submit a batch job
    @defer.inlineCallbacks
    def submit_batch_segments(self, data):
        # Get new job id/url

        r = yield self.get_new_job()
        response = r["response"]

        if "batch_segment_upload_job" in response:
            job_info = response["batch_segment_upload_job"]
            job_id = job_info["job_id"]
            job_url = job_info["upload_url"]
        else:
            raise StandardError("Problem requesting job id: {}".format(r.json))


        # Use the job url to submit the users
        #
        # Note that we can't use link for this, because the url isn't under
        # the same endpoint as the rest of AppNexus's API
        
        # Get uniques instead
        num_users = len(data)

        cb = functools.partial(self.log_submission, job_url, job_id, num_users)

        headers = {"Content-type": "application/octet-stream"}
        body_str = '\n'.join(data)

        http_client = AsyncHTTPClient()
        http_client.fetch(job_url, method='POST', headers=headers, body=body_str, callback=cb)

        # Log out the top 5-10 lines submitted

    def log_submission(self, job_url, job_id, num_users, response):
        print "Logging submission..."
        print response.body
        print type(response.body)
        response = ujson.loads(response.body)

        print response

        job_id = response['response']['segment_upload']['job_id']
        status = response['response']['status']
        
    def test_cb(self, response):
        print response
        print response.body
