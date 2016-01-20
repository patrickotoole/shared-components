from link import lnk
import requests, json, logging
import action_dashboard_cache as adc

VENDOR_QUERY = "select url_patterns, vendor from vendor_patterns"

json_obj = {"action_name": "","url_pattern": "", "segment":"vendor", "operator":"or"}
INSERT_URL = "http://crusher.getrockerbox.com/crusher/funnel/action?format=json"
PATTERN_URL = "http://crusher.getrockerbox.com/crusher/pattern_search/timeseries?search={}&num_days=7"


def buildIter(AC,advertiser):
    def iter_vendors(series):
        logging.info("making request for %s" % series.url_patterns)
        rr = requests.get(PATTERN_URL.format(series.url_patterns[0]), cookies=AC.cookie)
        logging.info("received data for advertiser %s and pattern %s" % (advertiser, series.url_patterns))
        try:
            if len(rr.json()['results']) >0:
                json_obj["action_name"] = series.vendor
                json_obj['url_pattern']= series.url_patterns
                r = requests.post(INSERT_URL, data = json.dumps(json_obj), cookies=AC.cookie)
                logging.info("status from response was %s and response was %s" % (r.status_code, r.json()))
        except:
            logging.error("could not decode response for advertiser %s and vendor %s" % (advertiser, series.url_patterns)) 
        return series
    return iter_vendors


if __name__ == "__main__":
    sql = lnk.dbs.rockerbox
    vendors = sql.select_dataframe(VENDOR_QUERY)
    advertisers = adc.get_all_advertisers()
    for advertiser in advertisers:
        AC = adc.ActionCache(advertiser[0], advertiser[1],sql)
        AC.auth()
        logging.info("populating action table for vendors for advertiser %s" % advertiser)
        vendors.T.apply(buildIter(AC,advertiser))
