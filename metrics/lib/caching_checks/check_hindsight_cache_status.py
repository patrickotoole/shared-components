from link import lnk

URL = "/crusher/v1/visitor/{}/cache?url_pattern={}"
URL2 = "/crusher/v1/visitor/{}/cache?url_pattern={}&filter_id={}"


def check_cache_endpoint(crusher, pattern):
    url = URL.format(pattern)
    _resp=crusher.get(url)
    data = _resp.json
    return data

def get_segments(crusher, advertiser):
    url = "/crusher/funnel/action?format=json"
    results = self.crusher_api.get(url)
    segments = []
    try:
        raw_results = results.json['response']
        for result in raw_results:
            single_seg = {"url_pattern": result['url_pattern'], "action_name":result['action_name'], "action_id":result['action_id']}
            segments.append(single_seg)
        logging.info("returned %s segments for advertiser %s" % (len(segments), self.advertiser))
    except:
        logging.error("error getting cookie for advertise with username: %s" % self.advertiser)
    return segments

def check_response(data):
    good_or_bad = True if len(data['response'])>1 else False
    return good_or_bad

if __name__ == "__main__":

    db = lnk.dbs.crushercache
    df = db.select_dataframe("select advertiser from topic_runner_segments")
    crusher = lnk.api.crusher
    
    for adv in df.iterrows():
        advertiser = adv[1]['advertiser']
        crusher.switch_user(advertiser)
        segments = get_segments(crusher, advertiser)
        for segment in segments:
            data = check_cache_endpoint(crusher, pattern)
            if check_response(data):
                print "Pass"
            else:
                print "Fail"
                print "Failed for advertiser %s and pattern %s" % (advertiser, segment)
