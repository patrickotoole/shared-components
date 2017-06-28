from cassandra.query import SimpleStatement
from twisted.internet import defer, threads
from lib.helpers import decorators

query = "select * from rockerbox.served_campaign_vendor where source='{}' and campaign='{}' and vendor='{}' and date='{}'"

class ServedUIDBase():
    
    @decorators.deferred
    def served_uids(self, advertiser, campaign_id, vendor, dates):
        uids = []
        ad_times=[]
        for date in dates:
            Q = query.format(advertiser, campaign_id, vendor, date)
            statement = SimpleStatement(Q, fetch_size=1000)
            for user_row in self.cassandra.execute(statement):
                uids.append(user_row['uid'])
                ad_times.append({"domain":user_row['domain'], "timestamp": user_row["timestamp"], "date":user_row["date"], "uid":user_row['uid'], "url":user_row["url"]})
        if len(uids) <300:
            Exception("not enough users")

        return uids, ad_times
