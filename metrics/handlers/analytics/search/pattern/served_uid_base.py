from cassandra.query import SimpleStatement
from twisted.internet import defer, threads
from lib.helpers import decorators

campaign_query = "select * from rockerbox.served_campaign_vendor_v2 where source='{}' and campaign='{}' and vendor='{}' and date='{}'"
vendor_query = "select * from rockerbox.served_campaign_vendor_v2 where source='{}' and vendor='{}' and date='{}'"

CAMPAIGNQUERY = "select campaign_id from action_campaign where filter_id='{}'"

class ServedUIDBase():

    def campaign_id_lookup(self, filter_id):
        campaign_id = self.db.select_dataframe(CAMPAIGNQUERY.format(filter_id))
        if campaign_id.empty:
            _campaign_id = 0
        else:
            _campaign_id = campaign_id.ix[0]['campaign_id']
        return _campaign_id

    
    @decorators.deferred
    def served_uids(self, advertiser, filter_id, vendor, dates):
        uids = []
        ad_times=[]
        campaign_id = self.campaign_id_lookup(filter_id)
        for date in dates:
            if campaign_id == 0:
                Q = vendor_query.format(advertiser, vendor, date)
            else:
                Q = campaign_query.format(advertiser, campaign_id, vendor, date)
            statement = SimpleStatement(Q, fetch_size=1000)
            for user_row in self.cassandra.execute(statement):
                uids.append(user_row['uid'])
                ad_times.append({"domain":user_row['domain'], "timestamp": user_row["timestamp"], "date":user_row["date"], "uid":user_row['uid'], "url":user_row["url"]})
        if len(uids) <300:
            Exception("not enough users")

        return uids, ad_times
