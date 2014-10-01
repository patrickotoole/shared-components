RB_API_BASE = "http://portal.getrockerbox.com:8080/admin/advertiser/viewable/reporting"
URL = RB_API_BASE + "?meta=domain_list&include=date,campaign&type=baublebar_womens_interest&date=%s&format=csv&campaign=%s" 

class ViewabilityAnalysis(object):
    def __init__(self,api,**obj):
        self.api = api
        self.__dict__.update(**obj)

        self._whitelist = None
        self._blacklist = None
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
            self.get_campaigns()
        return self._campaign_ids

    @property
    def viewability_report(self):
        if self._viewability_report is None:
            self.get_viewability_report()
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

    def _pull_campaigns(self,line_item_id):
        response = self.api.get("/line-item?id=%s" % line_item_id)
        campaign_list = response.json["response"]["line-item"]["campaigns"]
        return campaign_list

    def get_campaigns(self):
        line_item_id = self.learn_line_item_id 
        
        self._campaign_ids = [c["id"] for c in self._pull_campaigns(line_item_id)]
        return self._campaign_ids

    def get_viewability_report_csv(self,duration="past_month"):
        # use the API and pull the CSV
        import requests
        campaign_ids = self.campaign_ids
        
        campaign_string = ",".join(map(str,campaign_ids))
        compiled_url = URL % (duration,campaign_string)
        rq = requests.get(compiled_url)

        return rq.text.replace("<pre>","").replace("</pre>","")

    def get_viewability_report_df(self):
        # convert the csv to a df
        import pandas
        import StringIO
        csv = self.get_viewability_report_csv()
        s = StringIO.StringIO(csv)
        df = pandas.read_csv(s)
 
        return df

    def get_viewability_report(self):
        # add calculate columns to the df
        df = self.get_viewability_report_df()
        self._viewability_report = self.calc_percent_visible(df)

        return self._viewability_report

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


def main():
    from link import lnk
    dlv = lnk.dbs.mysql.select_dataframe("select * from domain_list_viewability")
    api = lnk.api.console

    obj = dlv.iloc[0].to_dict()
    va = ViewabilityAnalysis(api,**obj)
    print va.whitelist
    print va.blacklist

if __name__ == "__main__":
    main()
