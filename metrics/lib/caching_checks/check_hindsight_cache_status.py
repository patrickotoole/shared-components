from check_helper import *
from link import lnk
import logging
import pandas
import sys
from kazoo.client import KazooClient

logging.basicConfig(stream=sys.stdout, level=logging.INFO)

URL = "/crusher/v1/visitor/{}/cache?url_pattern={}"
URL2 = "/crusher/v1/visitor/{}/cache?url_pattern={}&filter_id={}"
TS_URL = "/crusher/pattern_search/timeseries_only?search={}"
TS_URL2 = "/crusher/pattern_search/timeseries_only?search={}&filter_id={}"


sections = {"hourly":"Timing", "sessions":"Timing", "before_and_after":"User Paths", "model":"Personas", "domains":"Top Sites", "domains_full":"Top Articles"}

def construct_all(result, fulldict):
    if result['has_filter']>0:
        single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
    else:
        single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name']}
    fulldict['all'].append(single_seg)
    return fulldict

def construct_featured(result, fulldict):
    fulldict['featured'] = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
    return fulldict

def get_segments(crusher, advertiser):
    url = "/crusher/funnel/action?format=json"
    results = crusher.get(url, timeout=1000)
    segments ={}
    segments['featured']=''
    segments['all']=[]
    raw_results = results.json['response']
    for result in raw_results:
        if result['featured'] ==1:
            segments = construct_featured(result, segments)
        segments = construct_all(result,segments)
    logging.info("returned %s segments for advertiser %s" % (len(segments), advertiser))
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
        self.udf_list = ['domains', 'domains_full', 'before_and_after', 'model', 'hourly', 'sessions', 'keywords']
    
    def check_segment_udf(self, crusher, segment, udf):
        data = self.check_cache_endpoint(crusher, segment, udf)
        passed = False
        if check_response(data):
            logging.info("Pass for advertiser %s and pattern %s and udf %s" % (advertiser, segment, udf))
            passed = True
        else:
            logging.info("Failed for advertiser %s and pattern %s and udf %s" % (advertiser, segment, udf))
        return passed

    def check_cache_endpoint(self,crusher, pattern, udf):
        if pattern.get('action_id'):
            url = URL2.format(udf, pattern['url_pattern'][0], pattern['action_id'])
        else:
            url = URL.format(udf, pattern['url_pattern'][0])
        try:
            _resp=crusher.get(url, timeout=300)
            data = _resp.json
        except Exception as e:
            logging.info(str(e))
            data ={}
        return data

    def check_cassandra_cache(self,crusher, pattern):
        import datetime
        if pattern.get("action_id"):
            url = TS_URL2.format(pattern['url_pattern'][0], pattern['action_id'])
        else:
            url = TS_URL.format(pattern['url_pattern'][0])
        allcached = True
        enough = True
        try:
            _resp=crusher.get(url,timeout=500)
            data = _resp.json
        except:
            logging.info("timeout error Cassandra")
            data = {"results":""}
        for day in data['results']:
            if day['uniques']!=0 and day['uniques']<25:
                enough = False
            if day['uniques']==0 or day['visits']==0 or day['views']==0:
                allcached=False
        if not allcached:
            logging.info("Failed for advertiser %s and pattern %s and udf %s" % (advertiser, pattern, 'Cassandra cache'))
        return allcached, enough

    def check_cache_dashboard(self,pattern):
        result = self.check_cache_endpoint(self.crusher, pattern,'domains_full_time_minute')
        if "summary" in result.keys() and len(result['summary'].keys()) > 2:
            dash = 1
        else:
            dash = 0
            send_to_me_slack("Failed for advertiser %s and pattern %s and udf %s" % (advertiser, segment, "DASHBOARD!!"))
        return dash

    def segment_udf_wrapper(self,crusher, segment, udf):
        passed_udf = self.check_segment_udf(crusher,segment,udf)
        if not passed_udf:
            send_to_me_slack("Failed for advertiser %s and pattern %s and udf %s" % (advertiser, segment, udf))
            send_to_me_slack("The section %s is not cached for segment %s and advertiser %s go to http://workqueue.getrockerbox.com to cache" % (sections[udf], segment['action_name'], advertiser))
        return passed_udf

    def check_segments(self):
        passed = 0
        total = 0
        dashboard = 0
        for segment in self.segments['all']:
            pattern = segment['url_pattern'][0]
            total+=1
            cached, enough = self.check_cassandra_cache(crusher, segment)
            if pattern in self.segments['featured']:
                dashboard = self.check_cache_dashboard(segment)
            if enough:
                pass_all_udf = True
                for udf in self.udf_list:
                    try:
                        pass_all_udf = pass_all_udf and self.segment_udf_wrapper(crusher, segment, udf)
                    except Exception as e:
                        print str(e)
                if pass_all_udf:
                    passed+=1
            else:
                logging.info("Not Enough data for advertiser %s and pattern %s" % (advertiser, segment))
                total-=1
        return total, passed, dashboard


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
        total, passed, dashboard = Crunner.check_segments()
        report = report.append(pandas.DataFrame([{"advertiser":advertiser, "Passed":passed, "Total":total, "Dashbaord":dashboard}]))
    send_to_slack("```"+report.to_string()+"```")
