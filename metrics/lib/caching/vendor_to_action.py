from link import lnk
import requests, json, logging
import cache_interface as ci
from kazoo.client import KazooClient

VENDOR_QUERY = "select url_patterns, vendor from vendor_patterns where medium is not null and medium_type is not null"

json_obj = {"action_name": "","url_pattern": "", "action_type":"vendor", "operator":"or"}

INSERT_URL = "http://beta.crusher.getrockerbox.com/crusher/funnel/action?format=json"
PATTERN_URL = "http://beta.crusher.getrockerbox.com/crusher/pattern_search/timeseries_only?search={}&num_days=7"

def sumResults(results_list):
    sum_list = []
    for i in results_list:
        sum_list.append(i['visits'])
    return sum(sum_list)

def buildIter(crusher,advertiser):
    def iter_vendors(series):
        logging.info("making request for %s" % series.url_patterns)
        if len(series.url_patterns[0])>1:
            rr = crusher.get(PATTERN_URL.format(series.url_patterns[0]))
        else:
            rr = crusher.get(PATTERN_URL.format(series.url_patterns))
        results_count = sumResults(rr['results'])
        logging.info("received data for advertiser %s and pattern %s" % (advertiser, series.url_patterns))
        existing_urls ={"urls":[]}
        exists = crusher.get(INSERT_URL)
        try:
            for e in exists.json['response']:
                existing_urls['urls'].append(e["action_name"])
            if results_count>0 and series.vendor not in existing_urls["urls"]:
                json_obj["action_name"] = series.url_patterns
                json_obj["url_pattern"] = [series.url_patterns]
                r = crusher.post(INSERT_URL, data = json.dumps(json_obj))
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
        advertisers = ci.get_all_advertisers(sql)
        for advertiser in advertisers:
            crusher = lnk.api.crusher
            crusher.base_url = "http://beta.crusher.getrockerbox.com"
            crusher.user = "a_{}".format(advertiser[0])
            crusher.password = advertiser[1]
            crusher.authenticate()
            logging.info("populating action table for vendors for advertiser %s" % advertiser)
            vendors.T.apply(buildIter(crusher,advertiser))
    else:
        sql = lnk.dbs.rockerbox
        vendors = sql.select_dataframe(VENDOR_QUERY)
        crusher = lnk.api.crusher
        crusher.user = options.username
        crusher.base_url = "http://beta.crusher.getrockerbox.com"
        crusher.password = options.password
        crusher.authenticate()
        advertiser = options.username.replace("a_","")
        logging.info("populating action table for vendors for advertiser %s" % advertiser)
        vendors.T.apply(buildIter(crusher,advertiser))

