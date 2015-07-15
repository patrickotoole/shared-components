import re
from link import lnk
from funnel_lib import FunnelMongoAPI

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

class BatchAPI:
    def __init__(self):
        self.api = lnk.api.console
        self.sql = lnk.dbs.reporting

    def get_pending_jobs(self):
        query = "SELECT * FROM reporting.batch_log_v2 where phase is NULL or phase != 'completed'"
        r = self.sql.select_dataframe(query)
        return r.job_id.tolist()

    def get_table_variables(self, table_name, excludes=None, includes=None):
        if excludes and includes:
            raise Exception("excludes and includes are mutually exclusive")

        df = self.sql.select_dataframe("describe {}".format(table_name))
        variables = df[["field","type"]].set_index("field").to_dict()["type"]
        
        if excludes:
            variables = { k:v for (k, v) in variables.iteritems() if k not in excludes}
        elif includes:
            variables = { k:v for (k, v) in variables.iteritems() if k in includes}

        return variables

    def make_insert_query(self, table_name, excludes=None, includes=None):
        variables = self.get_table_variables(table_name, excludes, includes)
        q = "INSERT INTO {} ({}) VALUES ({})"

        placeholders = []

        p = re.compile("(timestamp|varchar).*")
        for k,v in variables.iteritems():
            if p.match(v):
                placeholders.append('"%({})s"'.format(k))
            else:
                placeholders.append('%({})s'.format(k))

        schema = ', '.join(variables)
        values = ', '.join(placeholders)

        query = q.format(table_name, schema, values)

        return query

    def make_update_query(self, table_name, excludes=None, includes=None):
        variables = self.get_table_variables(table_name, excludes, includes)
        q = "UPDATE {} SET {} WHERE {}"

        placeholders = []
        p = re.compile("(timestamp|varchar).*")
        for k,v in variables.iteritems():
            if p.match(v):
                placeholders.append('{} = "%({})s"'.format(k,k))
            else:
                placeholders.append('{} = %({})s'.format(k,k))
        
        return q.format(table_name, ', '.join(placeholders), 'job_id= "%(job_id)s"')

    def update(self, job_id, data):
        pass

    def update_job_log(self, jobs_to_check):
        job_checklist = jobs_to_check[:]
        excludes=["source_type", "source_name", "num_users"]
        q = self.make_update_query("reporting.batch_log_v2", excludes=excludes)
        start_element = 0

        print "Jobs to check: {}".format(jobs_to_check)

        calls_made = 0

        while len(job_checklist) > 0 and calls_made < 20:
            url = "/batch-segment?&start_element={}&sort=last_modified.desc".format(start_element)

            print "Fetching job history..."
            try:
                r = self.api.get(url)
                jobs = r.json["response"]["batch_segment_upload_job"]
            except Exception as e:
                logger.error(e)
                raise Exception(e)

            if not jobs:
                raise Exception("No jobs found: {}".format(jobs))

            for job in jobs:
                job_id = job["job_id"]
                created_on = job["created_on"]
                
                logger.info("Found job id: {}, {}".format(job_id, created_on))

                if job_id in jobs_to_check:
                    # job = dict(job.items() + jobs_to_check[job_id].items())
                    logger.info("Job details: {}".format(job))
                    query = q % job
                    logger.info("Exceuting query: {}".format(query))
                    self.sql.execute(query)
                    job_checklist.remove(job_id)

            start_element += r.json["response"]["num_elements"]
            calls_made += 1

        if len(job_checklist) == 0:
            logger.info("All jobs found and updated in {} calls. Exiting...".format(calls_made))


batch_api = BatchAPI()
jobs = batch_api.get_pending_jobs()
batch_api.update_job_log(jobs)
