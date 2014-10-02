import logging

RB_API_BASE = "http://portal.getrockerbox.com:8080/admin/advertiser/viewable/reporting"
URL = RB_API_BASE + "?meta=domain_list&include=date,campaign&type=baublebar_womens_interest&date=%s&format=csv&campaign=%s" 

class DomainAPI(object):
    def __init__(self,api):
        self.api = api

    def pull_campaign_ids(self,line_item_id):
        logging.info("AppNexus API line-item request: %s" % line_item_id)

        response = self.api.get("/line-item?id=%s" % line_item_id)
        campaign_list = response.json["response"]["line-item"]["campaigns"]
        campaign_id_list = [c["id"] for c in campaign_list]
        
        logging.info("AppNexus API campaigns received: %s" % campaign_id_list)
        return campaign_id_list

    def update_domain_list(self,domain_list_id,domains):
        response = self.api.get("/domain-list?id=%s" % domain_list_id)
        existing_domains = response.json["response"]["domain-list"]["domains"]

        domains = list(set(existing_domains + list(domains.index)))
        logging.info("Modifying domain list %s: %s %s" % 
            (domain_list_id,len(existing_domains),len(domains))
        )

        obj = {"domain-list":{"domains":domains}}
        #put_response = self.api.put("/domain-list?id=%s" % domain_list_id, ujson.dumps(obj))

    def pull_viewability_csv(self,duration="past_month"):
        # use the API and pull the CSV
        import requests
        campaign_ids = self.campaign_ids
        
        campaign_string = ",".join(map(str,campaign_ids))
        compiled_url = URL % (duration,campaign_string)
        logging.info("Rockerbox API csv request for (%s): %s" % (duration,campaign_string)) 

        rq = requests.get(compiled_url)
        logging.info("Rockerbox API csv lines received: %s" % rq.text.count("\n"))  

        return rq.text.replace("<pre>","").replace("</pre>","")
     
    def get_viewability_df(self):
        # convert the csv to a df
        import pandas
        import StringIO
        csv = self.pull_viewability_csv()
        s = StringIO.StringIO(csv)
        df = pandas.read_csv(s,index_col=0)
 
        return df


class DomainAnalysis(DomainAPI):
    def __init__(self,api,**obj):
        self.api = api
        self.__dict__.update(**obj)

        self._whitelist = None
        self._blacklist = None
        self._greylist = None
        self._viewability_report = None
        self._campaign_ids = None 

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
    
    def get_viewability_report(self):
        df = self.get_viewability_df()
        return self.calc_percent_visible(df)

    def get_greylist(self):
        black_domains = list(self.blacklist.index)
        white_domains = list(self.whitelist.index)
        combined = black_domains + white_domains
        grey_domains = [i for i in self.viewability_report.index if i not in combined]
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
        self.update_domain_list(self.white_list_id, whitelist)

    def push_blacklist(self):
        blacklist = self.blacklist
        self.update_domain_list(self.black_list_id,blacklist) 

def main():
    from lib.report.utils.loggingutils import basicConfig 
    from link import lnk
    basicConfig(options={})
    dlv = lnk.dbs.mysql.select_dataframe("select * from domain_list_viewability")
    api = lnk.api.console

    for obj in dlv.iterrows():
        va = DomainAnalysis(api,**obj[1].to_dict())
        va.push_whitelist()
        va.push_blacklist()
        print va.greylist[va.greylist.served > 500].sort_index(by="served")

if __name__ == "__main__":
    main()
