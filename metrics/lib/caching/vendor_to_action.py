from link import lnk
import requests, json, logging
import action_dashboard_cache as adc

VENDOR_QUERY = "select url_patterns, vendor from vendor_patterns where medium is not null and medium_type is not null"

json_obj = {"action_name": "","url_pattern": "", "action_type":"vendor", "operator":"or"}

INSERT_URL = "http://beta.crusher.getrockerbox.com/crusher/funnel/action?format=json"
PATTERN_URL = "http://beta.crusher.getrockerbox.com/crusher/pattern_search/timeseries?search={}&num_days=7"

def buildIter(AC,advertiser):
    def iter_vendors(series):
        logging.info("making request for %s" % series.url_patterns)
        if len(series.url_patterns[0])>1:
            rr = requests.get(PATTERN_URL.format(series.url_patterns[0]), cookies=AC.cookie)
        else:
            rr = requests.get(PATTERN_URL.format(series.url_patterns), cookies=AC.cookie)
        logging.info("received data for advertiser %s and pattern %s" % (advertiser, series.url_patterns))
        existing_urls ={"urls":[]}
        exists = requests.get(INSERT_URL, cookies=AC.cookie)
        try:
            for e in exists.json()['response']:
                existing_urls['urls'].append(e["action_name"])
            if len(rr.json()['results'][0]['domains'])>0 and series.vendor not in existing_urls["urls"]:
                json_obj["action_name"] = series.url_patterns
                json_obj["url_pattern"] = [series.url_patterns]
                r = requests.post(INSERT_URL, data = json.dumps(json_obj), cookies=AC.cookie)
                logging.info("status from response was %s and response was %s" % (r.status_code, r.json()))
            else:
                logging.info("empty json results for %s or series vendor already existings for advertiser" % (series.url_patterns, advertiser))
        except:
            logging.error("could not decode response for advertiser %s and vendor %s" % (advertiser, series.url_patterns)) 
        return series
    return iter_vendors


if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("username",default=False)
    define("password",default=False)

    basicConfig(options={})
    parse_command_line()

    zookeeper = KazooClient(hosts="zk1:2181")
    zookeeper.start()

    if not options.username:
        sql = lnk.dbs.rockerbox
        vendors = sql.select_dataframe(VENDOR_QUERY)
        advertisers = adc.get_all_advertisers()
        for advertiser in advertisers:
            AC = adc.ActionCache(advertiser[0], advertiser[1],sql, zookeeper)
            AC.auth()
            logging.info("populating action table for vendors for advertiser %s" % advertiser)
            vendors.T.apply(buildIter(AC,advertiser))
    else:
        sql = lnk.dbs.rockerbox
        vendors = sql.select_dataframe(VENDOR_QUERY)
        AC = adc.ActionCache(options.username, options.password,sql,zookeeper)
        AC.auth()
        advertiser = options.username.replace("a_","")
        logging.info("populating action table for vendors for advertiser %s" % advertiser)
        vendors.T.apply(buildIter(AC,advertiser))

