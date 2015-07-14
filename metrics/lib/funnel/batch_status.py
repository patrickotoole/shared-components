from link import lnk
from funnel_lib import FunnelMongoAPI

class BatchAPI():
    def get_job_history(self, jobs_to_check):
        job_ids_to_check = jobs_to_check.keys()
        jobs_to_log = []
        start_element = 0

        print "Jobs to check: {}".format(job_ids_to_check)

        calls_made = 0

        while len(job_ids_to_check) > 0 and calls_made < 5:
            url = ("http://api.appnexus.com/batch-segment?member_id={}"
                   "&start_element={}&sort=last_modified.desc").format(self.member_id, start_element)

            print url
            print job_ids_to_check
            print "Fetching job history..."
            headers = {"Cookie": self.cookie}
            response, content = self.http.request(url, 'GET', headers=headers)

            json_data = json.loads(content)
            jobs = json_data["response"]["batch_segment_upload_job"]

            for job in jobs:
                print job['job_id']
                job_id = job["job_id"]
                if job_id in job_ids_to_check:
                    # Add to this dictionary existing information about the job
                    del job["id"]
                    job = dict(job.items() + jobs_to_check[job_id].items())

                    jobs_to_log.append(job)
                    job_ids_to_check.remove(job_id)

            start_element += json_data["response"]["count"]
            calls_made += 1

        self.write_log(jobs_to_log)

        print "Jobs left: {}".format(job_ids_to_check)


api = lnk.api.console
mongo = lnk.dbs.mongo

r = api.get("/batch_segment")
