import logging
from api import DomainAPI 

class DomainAnalysis(DomainAPI):
    def __init__(self,api,rb,db,**obj):
        self.an_api = api
        self.rb_api = rb
        self.db = db
        self.__dict__.update(**obj)

        self._whitelist = None
        self._blacklist = None
        self._greylist = None
        self._viewability_report = None
        self._campaign_ids = None 
        self._domain_list = None

    @staticmethod
    def calc_percent_visible(df):
        grouped = df.groupby(["domain"]).sum()[['served','visible','loaded']]
        grouped["percent_visible"] = grouped["visible"]/grouped["loaded"]   
        grouped["percent_loaded"] = grouped["loaded"]/grouped["served"]   

        return grouped

    @staticmethod
    def compute_whitelist(grouped,visible_threshold,loaded_threshold,learn_size):
        mask_learn   = (grouped["served"] > learn_size)
        mask_visible = (grouped["percent_visible"] > visible_threshold)

        to_whitelist = grouped[mask_learn & mask_visible]
        mask_loaded  = to_whitelist["percent_loaded"] > loaded_threshold
        to_whitelist = to_whitelist[mask_loaded]

        return to_whitelist

    @staticmethod
    def compute_blacklist(grouped,visible_threshold,loaded_threshold,learn_size): 
        mask_learn   = (grouped["served"] > learn_size)
        mask_visible = (grouped["percent_visible"] < visible_threshold)
        mask_loaded  = (grouped["percent_loaded"] < loaded_threshold)

        to_blacklist = grouped[mask_learn & (mask_visible | mask_loaded)]
        return to_blacklist 
     
    @property
    def campaign_ids(self):
        if self._campaign_ids is None:
            self._campaign_ids = self.pull_campaign_ids(self.learn_line_item_id)
        return self._campaign_ids

    @property
    def viewability_report(self):
        if self._viewability_report is None:
            self._viewability_report = self.get_viewability_report()
            logging.info("Have viewability info for %s domains on (%s)" % (len(self._viewability_report),self.domain_list_id))
        return self._viewability_report

    @property
    def whitelist(self):
        if self._whitelist is None:
            self._whitelist = self.get_whitelist()
        return self._whitelist

    @property
    def blacklist(self):
        if self._blacklist is None:
            self._blacklist = self.get_blacklist()
        return self._blacklist

    @property
    def greylist(self):
        if self._greylist is None:
            self._greylist = self.get_greylist()
        return self._greylist

    @property
    def domain_list(self):
        if self._domain_list is None:
            self._domain_list = self.get_domain_list(self.domain_list_id)
        return self._domain_list

    def missing_domains(self):
        _v = self.viewability_report
        _d = self.domain_list.set_index("pattern")
        _j = _d.join(_v) 

        missing = _j[_j.served.isnull()]
        logging.info("No served info for %s domains on (%s)" % (len(missing),self.domain_list_id))

        return missing

        
    
    def get_viewability_report(self):
        df = self.get_viewability_df(self.domain_list_id)
        return self.calc_percent_visible(df)

    def get_greylist(self):
        black_domains = list(self.blacklist.index)
        white_domains = list(self.whitelist.index)
        combined = black_domains + white_domains
        grey_domains = [i for i in self.viewability_report.index if i not in combined]
        logging.info("Collecting more data for %s domains on (%s)" % (len(grey_domains),self.domain_list_id))
        return self.viewability_report.ix[grey_domains]

    def get_whitelist(self):
        return self.compute_whitelist(
            self.viewability_report,
            self.whitelist_threshold, 
            self.loaded_threshold, 
            self.learn_size
        )

    def get_blacklist(self):
        return self.compute_blacklist(
            self.viewability_report,
            self.blacklist_threshold, 
            self.loaded_threshold, 
            self.learn_size
        )

    def push_whitelist(self):
        whitelist = self.whitelist
        logging.info("Whitelisted %s domains on %s" % (len(whitelist),self.domain_list_id))
        self.update_domain_list(whitelist,self.white_list_id, self.domain_list_id, "approve")

    def push_blacklist(self):
        blacklist = self.blacklist
        logging.info("Blacklisted %s domains on %s" % (len(blacklist),self.domain_list_id)) 
        self.update_domain_list(blacklist,self.black_list_id, self.domain_list_id, "ban") 
 
