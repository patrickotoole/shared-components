import tornado.web
import ujson
import functools
from batch_log import BatchLogHandler
from twisted.internet import defer
from tornado.httpclient import *
from lib.helpers import *

class BatchSubmitHandler(BatchLogHandler):

    def initialize(self, reporting_db=None, api=None, db=None):
        self.db = reporting_db
        self.api = api

    def get(self):
        self.write("Here")

    @tornado.web.asynchronous
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
        num_users = len(set(data))

        cb = functools.partial(self.log_submission, num_users)

        headers = {"Content-type": "application/octet-stream"}
        body_str = '\n'.join(data)

        http_client = AsyncHTTPClient()
        http_client.fetch(job_url, method='POST', headers=headers, body=body_str, callback=cb)

        # Log out the top 5-10 lines submitted

    def log_submission(self, num_users, response):
        data = ujson.loads(self.request.body)
        response_data = ujson.loads(response.body)
        print "Logging submission..."

        job_id = response_data['response']['segment_upload']['job_id']
        data["job_id"] = job_id
        data["num_users"] = num_users

        self.create_log(data)

        
