import logging
import ujson

RB_API_BASE = "http://portal.getrockerbox.com:8080/admin/advertiser/viewable/reporting"
URL = RB_API_BASE + "?meta=domain_list&include=date,campaign&type=%s&date=%s&format=csv&campaign=%s" 

LOGGING_SQL = "INSERT INTO domain_list_change_ref %(fields)s VALUES %(values)s"

class DomainAPI(object):
    def __init__(self,api,db):
        self.api = api
        self.db = db

    def pull_campaign_ids(self,line_item_id):
        logging.info("AppNexus API line-item request: %s" % line_item_id)

        response = self.api.get("/line-item?id=%s" % line_item_id)
        campaign_list = response.json["response"]["line-item"]["campaigns"]
        campaign_id_list = [c["id"] for c in campaign_list]
        
        logging.info("AppNexus API campaigns received: %s" % campaign_id_list)
        return campaign_id_list

    def get_existing_domains(self,domain_list_id):
        response = self.api.get("/domain-list?id=%s" % domain_list_id)
        existing_domains = response.json["response"]["domain-list"]["domains"]
        return existing_domains

    def log_domain_change(self,new_domain_df):
        
        records = new_domain_df.to_records()
        columns = tuple(["domain"] + list(new_domain_df.columns))
        values  = ", ".join(map(str,records))

        if len(records):
            params = {
                "fields": str(columns).replace("'","`"),
                "values": values
            }
            self.db.execute(LOGGING_SQL % params)
            logging.info("Adding domains: %s" % list(new_domain_df.index))
        

    def update_domain_list(self,domains,ext_domain_list_id,domain_list,action):

        domains["external_domain_list_id"] = ext_domain_list_id
        domains["domain_list"] = domain_list
        domains["action"] = action
        
        existing_domains = self.get_existing_domains(ext_domain_list_id)
        all_domains = list(set(existing_domains + list(domains.index)))
        new_domains = [d for d in all_domains if d not in existing_domains]

        self.log_domain_change(domains.ix[new_domains])

        logging.info("Modifying domain list %s: %s %s" % 
            (ext_domain_list_id,len(existing_domains),len(all_domains))
        )

        obj = {"domain-list":{"domains":all_domains}}
        put_response = self.api.put("/domain-list?id=%s" % ext_domain_list_id, ujson.dumps(obj))

    def pull_viewability_csv(self,domain_list,duration="past_month"):
        import requests
        campaign_ids = self.campaign_ids
        
        campaign_string = ",".join(map(str,campaign_ids))
        compiled_url = URL % (domain_list,duration,campaign_string)
        logging.info("Rockerbox API csv request for %s (%s): %s" % (domain_list,duration,campaign_string)) 

        rq = requests.get(compiled_url)
        logging.info("Rockerbox API csv lines received: %s" % rq.text.count("\n"))  

        return rq.text.replace("<pre>","").replace("</pre>","")
     
    def get_viewability_df(self,domain_list):
        import pandas
        import StringIO
        csv = self.pull_viewability_csv(domain_list)
        s = StringIO.StringIO(csv)
        df = pandas.read_csv(s,index_col=0)
 
        return df


class DomainAnalysis(DomainAPI):
    def __init__(self,api,db,**obj):
        self.api = api
        self.db = db
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
        df = self.get_viewability_df(self.domain_list_id)
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
        self.update_domain_list(whitelist,self.white_list_id, self.domain_list_id, "approve")

    def push_blacklist(self):
        blacklist = self.blacklist
        self.update_domain_list(blacklist,self.black_list_id, self.domain_list_id, "ban") 

def main():
    from lib.report.utils.loggingutils import basicConfig 
    from link import lnk
    import pandas as pd
    pd.set_option('display.max_columns', 100)
    pd.set_option('display.width', 100)

    basicConfig(options={})
    dlv = lnk.dbs.rockerbox.select_dataframe("select * from domain_list_viewability")
    api = lnk.api.console
    reporting_db = lnk.dbs.reporting

    for obj in dlv.iterrows():
        va = DomainAnalysis(api,reporting_db,**obj[1].to_dict())
        va.push_whitelist()
        va.push_blacklist()
        #print va.greylist[va.greylist.served > 500].sort_index(by="served")

if __name__ == "__main__":
    main()
