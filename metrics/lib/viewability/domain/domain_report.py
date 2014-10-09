import logging
import datetime

REPORT_FORM = ''' {
    "report": {
        "columns": [
            "site_domain", 
            "campaign_id", 
            "line_item_id", 
            "imps", 
            "clicks"
        ], 
        "filters": [
            {
                "buyer_member_id": "2024"
            }
        ], 
        "report_interval": "last_30_days", 
        "report_type": "network_site_domain_performance", 
        "special_pixel_reporting": false, 
        "timezone": "UTC"
    }
}
'''

TABLE_EXISTS = "show tables like '%v2_domain_reporting%'"
LAST_INSERT = "select max(last_insert) last_insert from %s"
SELECT = "select * from v2_domain_reporting where %s"

class DomainReport(object):
    def __init__(self,reporting,db):
        self.an_reporting = reporting
        self.db = db
        self.now = datetime.date.today()
        self.table_name = "v2_domain_reporting"
        self.check_table()

    @property
    def table_exists(self):
        _exists = self.db.select_dataframe(TABLE_EXISTS) 
        return len(_exists)

    @property
    def last_insert_date(self):
        try:
            last_insert = self.db.select_dataframe(LAST_INSERT % self.table_name)
            last_insert_str = last_insert['last_insert'][0]
            last_insert_date = datetime.datetime.strptime(last_insert_str,'%Y-%m-%d').date()
            return last_insert_date
        except:
            return datetime.date.today() + datetime.timedelta(-30)
     
    def get_data(self,campaign_ids=[]):
        where = "campaign_id in (%s)" % ",".join(map(str,campaign_ids))
        df = self.db.select_dataframe(SELECT % where)
        _g = df.groupby("site_domain")[['imps']].sum()
        return _g
        

    def check_table(self):
        if not self.table_exists or self.last_insert_date < self.now:
            self.rebuild_table()

    def rebuild_table(self):
        domains = self.pull_report()
        domains['last_insert'] = self.now
        domains.to_sql("v2_domain_reporting",self.db,flavor="mysql",if_exists="replace")

    def pull_report(self):
        PU_MSG = "Pulling domain report from appnexus"
        RE_MSG = "AppNexus domain report lines received: %s"

        logging.info(PU_MSG)
        domains = self.an_reporting.get_report(data=REPORT_FORM)
        logging.info(RE_MSG % len(domains))

        return domains

if __name__ == "__main__":
    from link import lnk
    d = DomainReport(lnk.api.reporting,lnk.dbs.reporting)
    print d.get_data([5251323]).head()
