import logging
import pandas
from api import VenueAPI 
from venue_report import VenueReport

class VenueAnalysis(VenueAPI):
    def __init__(self,an_api,reporting,db,rb_api,reporting_db,campaign_ids=[5298883],advertiser_id=302568, advertiser_name=None):
        self.an_api = an_api
        self.an_reporting = reporting
        self.db = db
        self.rb_api = rb_api
        self.reporting_db = reporting_db

        self._viewability_report = None
        self.advertiser_id = advertiser_id
        self._campaign_ids = campaign_ids
        self.advertiser_name = advertiser_name

    def log(self,msg):
        logging.info("[%s] %s" % (self.campaign_ids[0],msg))

    @staticmethod
    def calc_percent_visible(df,column="venue"):
        df[column] = df[column].map(int)
        grouped = df.groupby([column]).sum()[['served','visible','loaded']]
        grouped["percent_visible"] = grouped["visible"]/grouped["loaded"]   
        grouped["percent_loaded"] = grouped["loaded"]/grouped["served"]   

        return grouped

    @property
    def campaign_ids(self):
        return self._campaign_ids

    @property
    def viewability_report(self):
        if self._viewability_report is None:
            self._viewability_report = self.get_viewability_report()
            self.log("Have viewability info for %s" % (len(self._viewability_report)))
        return self._viewability_report

    @property
    def appnexus_report(self):
        if not hasattr(self, "_appnexus_report"):
            self._appnexus_report = VenueReport(self.an_reporting,self.db,self.advertiser_id).get_data(self.campaign_ids)
            self.log("Have appnexus venue report for %s" % 1)
        return self._appnexus_report

    @property
    def bad_venues(self):
        r = self.appnexus_report

        _joined = r.join(self.viewability_report)
        try:
            bad = _joined[(_joined.served.fillna(0)/_joined.imps < .05) & (_joined.imps > 500)]
        except:
            #import ipdb; ipdb.set_trace()
            pass
        return bad
    
    def get_viewability_report(self):
        df = self.get_viewability_df()
        if len(df) > 0:
            return self.calc_percent_visible(df)
        else:
            raise Exception("No venue data for advertiser %s" % self.advertiser_id)

    @property
    def hidden_venues(self):
        _v = self.viewability_report
        _v = _v[(_v.served > 500) & ((_v.percent_loaded < .5) | (_v.percent_visible < .4))]
        return _v

    @property
    def good_venues(self):
        _v = self.viewability_report
        _v = _v[(_v.served > 500) & ~((_v.percent_loaded < .5) | (_v.percent_visible < .4))]
        return _v

    @property
    def learn_venues(self):
        _v = self.viewability_report
        _v = _v[(_v.served < 500)] 
        return _v
     
     

if __name__ == "__main__":
    from link import lnk
    _d = VenueAnalysis(lnk.api.reporting,lnk.dbs.venue,lnk.api.rockerbox)
    _v = _d.viewability_report
    print _v.sort_index(by="served",ascending=False).head(10) 
