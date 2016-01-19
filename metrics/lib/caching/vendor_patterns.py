import requests, pandas, logging
from link import lnk
import action_dashboard_cache as adc

API_URL = "http://192.168.99.100:8888/crusher/pattern_search/timeseries?search={}&num_days=7"

SQL_QUERY = "insert into vendor_patterns (url_patterns, vendor) values ( '{}','{}')"


class VendorPattern:

    def __init__(self, data, name):
        self.data = data
        self.advertiser_name = name
        self.data[self.advertiser_name] = []
    
    def applyRefer(self,series):
        vendor = self.parseRefer(series.url)
        if vendor not in self.data[self.advertiser_name]:
            self.data[self.advertiser_name].append(vendor)
        return series

    def parseRefer(self,string):
        try:
            splitRef = string.split("utm_source=")
            utm_source = splitRef[1].split("&")[0]
            return utm_source
        except:
            return None

if __name__ == "__main__":
    sql = lnk.dbs.rockerbox
    advertisers = adc.get_all_advertisers()
    for advertiser in advertisers:
        logging.info("in loop for advertiser %s" % advertiser)
        AC = adc.ActionCache(advertiser[0], advertiser[1],sql)
        advertiser_name = advertiser[0].replace("a_","")
        AC.auth()
        rrr = requests.get(API_URL.format("utm_source="), cookies=AC.cookie)
        logging.info("requested utm_source pattern match for advertiser %s"  % advertiser_name)
        vp = VendorPattern({}, advertiser_name)
        try:
            df = pandas.DataFrame(rrr.json()['urls'])
            df.T.apply(vp.applyRefer)
            logging.info("about to loop for sql insert for advertiser %s" % advertiser_name)
            for source in vp.data[vp.advertiser_name]:
                try:
                    sql.execute(SQL_QUERY.format(source, source))
                except:
                    logging.error("could not write to sql table, duplicate records on primary key may exist")
        except:
            logging.error("error writing to table for advertiser %s" % advertiser)
