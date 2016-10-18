from check_helper import *
from link import lnk
import logging
import pandas
import sys
from kazoo.client import KazooClient

logging.basicConfig(stream=sys.stdout, level=logging.INFO)

URL = "/crusher/v1/visitor/{}/cache?url_pattern={}"
URL2 = "/crusher/v1/visitor/{}/cache?url_pattern={}&filter_id={}"
TS_URL = "/crusher/pattern_search/timeseries_only?search={}&filter_id={}"

def get_segments(crusher, advertiser):
    url = "/crusher/funnel/action?format=json"
    results = crusher.get(url)
    segments ={}
    segments['featured']=''
    segments['all']=[]
    try:
        raw_results = results.json['response']
        for result in raw_results:
            if result['featured'] ==1:
                segments['featured'] = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
            single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
            segments['all'].append(single_seg)
        logging.info("returned %s segments for advertiser %s" % (len(segments), advertiser))
    except:
        logging.error("error getting cookie for advertise with username: %s" % advertiser)
    return segments

def send_to_slack(message):
    import requests
    import ujson
    url= "https://hooks.slack.com/services/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"
    requests.post(url, data=ujson.dumps({"text":message}))

def send_to_me_slack(message):
    import requests
    import ujson
    url = 'https://hooks.slack.com/services/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'
    requests.post(url, data=ujson.dumps({"text":message}))


class CheckRunner():
    def __init__(self, advertiser, connectors):
        self.connectors = connectors
        self.advertiser = advertiser
        self.crusher = connectors['crusher_wrapper']
        self.crusher.user = "a_{}".format(advertiser)
        self.crusher.authenticate()
        self.segments = get_segments(crusher, advertiser)
        self.total =0
        self.passed = 0
        self.passedCache=False
        self.passedCassandra = False
        self.failed=[]
        self.low_volume_segments=[]
        self.udf_list = ['domains', 'domains_full', 'before_and_after', 'model', 'hourly', 'sessions', 'keywords']
    
    def get_max_cassandra_date(self,crusher, pattern):
        import datetime
        url = TS_URL.format(pattern['url_pattern'][0], pattern['action_id'])
        max_date=False
        try:
            _resp=crusher.get(url)
            data = _resp.json
            data2 = data['results']
            data_sorted = sorted(data2, key=lambda x : x['date'], reverse=True)
            for day in data_sorted:
                if day['views'] ==0 and not max_date:
                    max_date = day['date']
                if day['views']>0 and max_date:
                    max_date= False
                    break
        except Exception as e:
            logging.info(str(e))
            max_date=False
        return max_date

    def check_segment_udf(self, crusher, segment, udf):
        data = self.check_cache_endpoint(crusher, segment, udf)
        passed = False
        if check_response(data):
            logging.info("Pass for advertiser %s and pattern %s and udf %s" % (advertiser, segment, udf))
            self.passedCache=True
            passed = True
        else:
            logging.info("Fail")
            logging.info("Failed for advertiser %s and pattern %s and udf %s" % (advertiser, segment, udf))
            self.passedCache=False
            passed = False
        return passed

    def check_cache_endpoint(self,crusher, pattern, udf):
        url = URL2.format(udf, pattern['url_pattern'][0], pattern['action_id'])
        try:
            _resp=crusher.get(url)
            data = _resp.json
        except Exception as e:
            logging.info(str(e))
            data ={}
        return data

    def check_cassandra_cache(self,crusher, pattern, max_date):
        import datetime
        url = TS_URL.format(pattern['url_pattern'][0], pattern['action_id'])
        allcached = True
        try:
            _resp=crusher.get(url)
            data = _resp.json
            for day in data['results']:
                if max_date:
                    day['date'] = datetime.datetime.strptime(day['date'], '%Y-%m-%d %H:%M:%S')
                    if (day['date'] > max_date) and (day['uniques']==0 or day['visits']==0 or day['views']==0):
                        raise Exception("missing backfill or recurring")
                else:
                    if day['uniques']==0 or day['visits']==0 or day['views']==0:
                        raise Exception("missing backfill or recurring")
        except Exception as e:
            logging.info(str(e))
            allcached=False
        return allcached

    def is_low_volume(self,crusher, pattern):
        low_volume = False
        total_visits=0
        count_of_zero = 0
        try:
            url = TS_URL.format(pattern['url_pattern'][0], pattern['action_id'])
            _resp=crusher.get(url)
            data = _resp.json
            for day in data['results']:
                total_visits += day['visits']
                if day['visits']==0:
                    count_of_zero+=1
            if total_visits<50 or count_of_zero > 14:
                low_volume = True
        except Exception as e:
            logging.info(str(e))
        return low_volume

    def check_segments(self):
        max_date = self.get_max_cassandra_date(crusher, self.segments['featured']) 
        for segment in self.segments['all']:
            self.total+=1
            for udf in self.udf_list:
                passed = self.check_segment_udf(crusher,segment,udf)
                if not passed:
                    break
            cached = self.check_cassandra_cache(crusher, segment, max_date)
            if cached:
                logging.info("Pass for advertiser %s and pattern %s and udf %s" % (advertiser, segment, 'Cassandra cache'))
                self.passedCassandra = True
            else:
                low_volume = self.is_low_volume(crusher, segment)
                if low_volume:
                    logging.info("low volume segment")
                    logging.info("Low VOLUME for advertiser %s and pattern %s and udf %s" % (advertiser, segment, 'Cassandra cache'))
                    self.low_volume_segments.append(segment['action_id'])
                    self.total-=1
                else:
                    self.passedCassandra = False
                    logging.info("Fail")
                    logging.info("Failed for advertiser %s and pattern %s and udf %s" % (advertiser, segment, 'Cassandra cache'))

            #increment
            if self.passedCache and self.passedCassandra:
                self.passed+=1
            else:
                if segment['action_id'] not in self.low_volume_segments:
                    self.failed.append(str(segment['url_pattern'][0] + str(segment['action_id'])))
            #reset
            self.passedCache=False
            self.passedCassandra = False

        return self.total,self.passed, self.failed


if __name__ == "__main__":

    db = lnk.dbs.crushercache
    df = db.select_dataframe("select advertiser from topic_runner_segments")
    crusher = lnk.api.crusher
  
    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    connectors={}
    db2 = lnk.dbs.rockerbox
    connectors['crushercache'] = db
    connectors['db'] = db2
    connectors['zk'] = zk
    connectors['crusher_wrapper'] = crusher
 
    report = pandas.DataFrame()
    for adv in df.iterrows():
        advertiser = adv[1]['advertiser']
        Crunner = CheckRunner(advertiser,connectors)
        total, passed, failed = Crunner.check_segments()
        #run featured cassandra date max
        logging.info("For advertiser: %s There are %s segments of which %s passed tests" % (advertiser, total, passed))
        msg1 = "For advertiser: %s There are %s segments of which %s passed tests" % (advertiser, total, passed)
        logging.info("these failed %s" % failed)
        msg2 = "these failed %s for %s" % (failed, advertiser)
        report = report.append(pandas.DataFrame([{"advertiser":advertiser, "Passed":passed, "Total":total}]))
        send_to_me_slack(msg2)
    send_to_slack("```"+report.to_string()+"```")
