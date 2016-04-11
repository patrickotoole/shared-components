from log import *
from timeutils import now

def lookup(db,params):
    Q = "SELECT id, report_id from log_appnexus_report_processed where external_advertiser_id = %(advertiser_id)s and report_name = '%(report_name)s' and report_start_date = '%(start_date)s' and report_end_date = '%(end_date)s'" % params
    return db.select_dataframe(Q)

class AppnexusReport(object):

    def __init__(self, api=None, db=None, advertiser_id=None, start_date=None, end_date=None, report_name=None): 
        self.api = api
        self.db = db

        self.advertiser_id = advertiser_id
        self.start_date = start_date
        self.end_date = end_date
        self.report_name = "analytics"

        self.params = {
            "advertiser_id" : self.advertiser_id,
            "report_name" : self.report_name,
            "start_date" : self.start_date,
            "end_date" : self.end_date
        }

    def lookup_report(self):

        df = lookup(self.db,self.params)
        if len(df) > 0: 
            self.params['report_id'] = df['report_id'][0]
            self.params['id'] = df['id'][0]

            return list(df.report_id)[0]

        log_init(self.db,self.params)

        return False

    def request_report(self, advertiser_id, form):

        report_id = self.lookup_report()
        if report_id: return report_id

        resp = self.api.post('/report?advertiser_id=%s' % advertiser_id, data=form)
        response = resp.json.get("response")

        error = response.get("error")
        if error: logging.info(error)

        report_id = response.get("report_id",False)

        self.params['report_id'] = report_id
        log_report_id(self.db, self.params)

        return report_id

    def get_report(self, report_id, retry=0, max_retries=10):

        resp = self.api.get("/report?id=%s" % report_id)
        response = resp.json.get("response")
        url = response.get('report').get('url')

        if not url:
            retry += 1
            print "Retry: %s, sleeping %s" % (retry, retry*5)
            import time
            time.sleep(retry*5)
            if (retry + 1) < max_retries:
                return self.get_report(report_id, retry, max_retries)
            raise Exception("no report url")

        if not url.startswith('/'): 
            url = "/%s" % url

        return url

    def download_report(self,url):
        import io
        now_str = now()

        resp = self.api.get(url).content
        self.params['retreived_at'] = now_str
        self.params['report_num_rows'] = resp.count("\r\n")
        log_retreived(self.db, self.params)

        return io.StringIO(unicode(resp))


