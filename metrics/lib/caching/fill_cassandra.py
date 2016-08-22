from lib.cassandra_cache.run import *
from link import lnk

QUERY = "select advertiser from topic_runner_segments"
TS_URL = "/crusher/pattern_search/timeseries_only?search={}"

class wqBackfill():

    def __init__(self, connectors):
        self.connectors = connectors
        self.crusher = self.connectors['crusher_wrapper']

    def get_segments(self,advertiser):
        url = "/crusher/funnel/action?format=json"
        results = self.crusher.get(url)
        segments = []
        try:
            raw_results = results.json['response']
            for result in raw_results:
                single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
                segments.append(single_seg)
            logging.info("returned %s segments for advertiser %s" % (len(segments), advertiser))
        except:
            logging.error("error getting cookie for advertise with username: %s" % advertiser)
        return segments

    def get_advertisers(self):
        advertisers = self.connectors['crushercache'].select_dataframe(QUERY)
        return advertisers

    def check_cassandra_cache(self,pattern):
        url = TS_URL.format(pattern)
        missing = []
        try:
            _resp=self.crusher.get(url)
            data = _resp.json
            for day in data['results']:
                if day['uniques']==0 or day['visits']==0 or day['views']==0:
                    missing.append(day['date'])
        except Exception as e:
            print str(e)
        return missing

    def run_advertisers(self,advertisers):
        for adv in advertisers.iterrows():
            advertiser = adv[1]['advertiser']
            #verifty crusher
            if self.crusher.user == "a_{}".format(advertiser):
                pass
            else:
                self.crusher.user = "a_{}".format(advertiser)
                self.crusher.authenticate()
            segments = self.get_segments(advertiser)
            for segment in segments:
                self.run_segment(advertiser, segment['url_pattern'][0])

    def run_segment(self, advertiser, segment):
        missing = self.check_cassandra_cache(segment)
        if not missing:
            print "Segment %s is fully cached" % segment
        for date in missing:
            cache_date = date.split(" ")[0]
            run_backfill(advertiser, segment, cache_date, connectors=self.connectors)

def runner(**kwargs):
    wqb = wqBackfill(kwargs['connectors'])
    if kwargs['advertiser']:
        segments = wqb.get_segments(kwargs['advertiser'])
        for segment in segments:
            wqb.run_segment(kwargs['advertiser'], segment['url_pattern'][0])
    else:
        advertisers = wqb.get_advertisers()
        wqb.run_advertisers(advertisers)
    

if __name__ == "__main__":
    from kazoo.client import KazooClient

    crusher = lnk.api.crusher
    db = lnk.dbs.rockerbox
    cr = lnk.dbs.crushercache
    cassandra = lnk.dbs.cassandra
    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    
    connectors = {}
    connectors['crushercache'] = cr
    connectors['db'] = db
    connectors['cassandra'] = cassandra
    connectors['zk'] = zk
    connectors['crusher_wrapper'] = crusher

    wqb = wqBackfill(connectors)
    advertisers = wqb.get_advertisers()
    wqb.run_advertisers(advertisers)
    wqb.check_cassandra_cache()
