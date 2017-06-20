from cassandra.query import SimpleStatement
from twisted.internet import defer, threads
from lib.helpers import decorators

query = "select uid from rockerbox.served_campaign_vendor where source='{}' and campaign='{}' and vendor='{}' and date='{}'"

class ServedUidBase():
    
    @decorators.deferred
    def served_uids(self, advertiser, campaign_id, vendor, dates):
        uids = []
        for date in dates:
            Q = query.format(advertiser, campaign_id, vendor, date)
            statement = SimpleStatement(Q, fetch_size=1000)
            for user_row in self.cassandra.execute(statement):
                uids.append(user_row['uid'])
        if len(uids) <300:
            Exception("not enough users")

        return uids
