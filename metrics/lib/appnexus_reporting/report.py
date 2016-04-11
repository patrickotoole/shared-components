import logging

class Report(object):

    def __init__(self, db, api, advertiser_id, start_date, end_date, reports=["analytics_new","conversions"]):
        self.db = db
        self.api = api
        self.advertiser_id = advertiser_id
        self.reports = reports
        self.start_date = start_date
        self.end_date = end_date

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

    def run_analytics_new(self,table):
        from report_types import analytics

        df = analytics.run(self.api, self.db, table, self.advertiser_id, self.start_date, self.end_date)
        print df.head()

    def run_conversions(self,table):
        logging.info("Run conversions")
        pass

    def run(self):
        reports = self.get_reports()
        self.run_reports(reports)
