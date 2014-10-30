import logging
import datetime

REPORT_FORM = '''
{
    "report": {
        "columns": [
            "advertiser_id",
            "line_item_id",
            "campaign_id",
            "venue_id",
            "imps",
            "clicks"
        ],
        "filters": [
            {
                "buyer_member_id": "2024"
            },
            {
                "imp_type_id": {
                    "operator": "!=",
                    "value": 6
                }
            }
        ],
        "end_date": "%(end_date)s",
        "start_date": "%(start_date)s",
        "report_type": "network_advertiser_analytics",
        "row_per": [
            "campaign_id",
            "venue"
        ],
        "timezone": "UTC"
    }
}
'''

TABLE_NAME = "%s_venue_reporting"
TABLE_EXISTS = "show tables like '%%%s%%'"
LAST_INSERT = "select max(last_insert) last_insert from %s"
SELECT = "select * from %s where %s"

class VenueReport(object):
    def __init__(self,reporting,db,advertiser_id):
        self.an_reporting = reporting
        self.db = db
        self.now = datetime.date.today()
        self.advertiser_id = advertiser_id 
        self.check_table()


    @property
    def table_name(self):
        return TABLE_NAME % self.advertiser_id

    @property
    def table_exists(self):
        _exists = self.db.select_dataframe(TABLE_EXISTS % self.table_name) 
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
        df = self.db.select_dataframe(SELECT % (self.table_name,where))
        _g = df.groupby("venue_id")[['imps']].sum()
        return _g
        

    def check_table(self):
        if not self.table_exists or self.last_insert_date < self.now:
            self.rebuild_table()

    def rebuild_table(self):
        venues = self.pull_report()
        venues['last_insert'] = self.now
        venues.to_sql(self.table_name,self.db,flavor="mysql",if_exists="replace")

    def pull_report(self):
        PU_MSG = "Pulling domain report from appnexus"
        RE_MSG = "AppNexus domain report lines received: %s"

        logging.info(PU_MSG)
        params = {
            "start_date": self.now + datetime.timedelta(-30),
            "end_date": self.now
        }
        venues = self.an_reporting.get_report(
            advertiser_id=self.advertiser_id,
            data=REPORT_FORM % params
        )
        logging.info(RE_MSG % len(venues))

        return venues

if __name__ == "__main__":
    from link import lnk
    advertiser_id = 302568
    d = VenueReport(lnk.api.reporting,lnk.dbs.venue,advertiser_id)
    print d.get_data([5298883]).sort_index(by="imps",ascending=False).head()
