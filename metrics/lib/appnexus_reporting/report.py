import logging

class AppnexusReport(object):

    def __init__(self, api= None): 
        self.api = api

    def request_report(self, advertiser_id, form):
        resp = self.api.post('/report?advertiser_id=%s' % advertiser_id, data=form)
        response = resp.json.get("response")

        error = response.get("error")
        if error: logging.info(error)

        report_id = response.get("report_id",False)
        return report_id

    def get_report(self, report_id):
        resp = self.api.get("/report?id=%s" % report_id)
        response = resp.json.get("response")
        url = repsonse.get('report').get('url')

        if not url:
            raise Exeception("no report url")

        return url

    def download_report(self,url):
        import io

        if not url.startswith('/'): url = "/%s" % url

        resp = self.api.get(url)
        return io.StringIO(unicode(resp))



class Report(object):

    def __init__(self, db, api, advertiser_id, reports=["analytics","conversions"]):
        self.db = db
        self.api = api
        self.advertiser_id = advertiser_id
        self.reports = reports

    def get_reports(self):
        Q = "select * from reporting.report"

        df = self.db.select_dataframe(Q)
        df = df[df.name.isin(self.reports)]
        return df

    def run_reports(self,report_df):
        for row in report_df.to_dict("records"):
            report_name = row['name']
            report_table = row['table']
            self.__getattribute__("run_" + report_name)(report_table)

    def run_analytics(self,table):

        report_wrapper = AppnexusReport(self.api)

        report_id = report_wrapper.request_report(self.advertiser_id,"{}")
        assert report_id # we should get back a report_id

        report_url = report_wrapper.request_report(report_id)
        assert report_url # we should get back a report_url

        report_string = report_wrapper.download_report(report_url)
 

        print "Run analytics"
        logging.info("Run analytics")
        pass

    def run_conversions(self,table):
        logging.info("Run conversions")
        pass

    def run(self):
        reports = self.get_reports()
        self.run_reports(reports)



if __name__ == "__main__":
    from link import lnk
    r = Report(lnk.dbs.reporting,lnk.api.console,430556)
    r.run()
