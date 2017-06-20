from twisted.internet import defer, threads
from lib.helpers import decorators

class OnsiteUidBase():

    @defer.inlineCallbacks    
    def onsite_uids(self, advertiser, term, dates, num_days, allow_sample, filter_id):

        args = [advertiser,term,dates,num_days,allow_sample,filter_id]
        full_df, _, _, _ = yield self.get_sampled(*args)
        uids = list(set(full_df.uid.values))

        MIN_UIDS = 300
        if len(uids) < MIN_UIDS:
            ALLOWSAMPLEOVERRIDE = False
            NUM_DAYS = 7
            args[4] = ALLOWSAMPLEOVERRIDE
            args[3] = NUM_DAYS
            full_df, _, _, _ = yield self.get_sampled(*args)
            uids = list(set(full_df.uid.values))

        defer.returnValue(uids)
