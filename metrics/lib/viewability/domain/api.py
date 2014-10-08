import requests 
import ujson
import logging

REPORT_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","report_interval":"last_30_days","filters":[{"buyer_member_id":"2024"}],"columns":["site_domain","campaign_id","line_item_id","imps","clicks"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":"","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

RB_API_BASE = "/advertiser/viewable/reporting"
URL = RB_API_BASE + "?meta=none&include=domain&type=%s&date=%s&format=json&campaign=%s" 

LOGGING_SQL = "INSERT INTO domain_list_change_ref %(fields)s VALUES %(values)s"
DOMAIN_REPORT_INSERT = "INSERT INTO v2_domain_reporting"


class DomainAPI(object):
    def __init__(self,api,reporting,rb,db):
        self.an_api = api
        self.an_reporting = reporting
        self.rb_api = rb
        self.db = db

    def get_campaign_ids(self,line_item_id):
        LI_MSG = "AppNexus API line-item request: %s"
        CA_MSG = "AppNexus API campaigns received: %s"

        logging.info(LI_MSG % {"line_item_id":line_item_id})

        response = self.an_api.get("/line-item?id=%s" % line_item_id)
        campaigns = response.json["response"]["line-item"]["campaigns"]
        self.advertiser_id = response.json["response"]["line-item"]["advertiser_id"] 
        id_list = [c["id"] for c in campaigns]
        
        logging.info(CA_MSG % id_list)
        return id_list

    def get_existing_domains(self,domain_list_id):
        response = self.an_api.get("/domain-list?id=%s" % domain_list_id)
        existing_domains = response.json["response"]["domain-list"]["domains"]
        return existing_domains

    def domain_change_ref(self,new_domain_df):
        MSG = "Adding domains: %s"
        
        records = new_domain_df.to_records()
        columns = tuple(["domain"] + list(new_domain_df.columns))
        values  = ", ".join(map(str,records)).replace("(u'","('")

        if len(records):
            params = {
                "fields": str(columns).replace("'","`").replace("u`","`"),
                "values": values
            }
            logging.info(LOGGING_SQL % params)
            self.db.execute(LOGGING_SQL % params)
            logging.info(MSG % list(new_domain_df.index))
        
    @classmethod
    def add_acct_to_df(self,domains,external_id,domain_list,action):

        domains["external_domain_list_id"] = external_id
        domains["domain_list"] = domain_list
        domains["action"] = action

        return domains

    def update_domain_list(self,domains,external_id,domain_list,action):
        URL = "/domain-list?id=%s"
        MOD_MSG = "Modifying AppNexus domain list %s: %s %s"

        self.add_acct_to_df(domains,external_id,domain_list,action)

        _domains = list(domains.index)
        _existing = self.get_existing_domains(external_id)
        _all = list(set(_existing + _domains))

        count_ext = len(_existing)
        count_all = len(_all)

        _new = [d for d in _all if d not in _existing]
        _new_df = domains.ix[_new]

        self.domain_change_ref(_new_df)

        logging.info(MOD_MSG % (external_id,count_ext,count_all))

        obj = {"domain-list":{"domains":_all}}
        put_response = self.an_api.put(URL % external_id, ujson.dumps(obj))

    def get_domain_list(self,domain_list):
        URL = "/advertiser/domain_list/streaming?format=json&log=%s"
        DL_MSG = "Domains on list %s: %s"

        domains = self.rb_api.get_report(URL % domain_list)
        logging.info(DL_MSG % (domain_list,len(domains)))

        return domains
        
    def get_viewability_df(self,domain_list,duration="past_month"):
        RQ_MSG = "Rockerbox API request for %s (%s): %s"
        LN_MSG = "Rockerbox API lines received: %s"

        campaign_string = ",".join(map(str,self.campaign_ids))
        compiled_url = URL % (domain_list,duration,campaign_string)

        logging.info(RQ_MSG % (domain_list,duration,campaign_string)) 
        df = self.rb_api.get_report(compiled_url)
        logging.info(LN_MSG % len(df))

        return df
 
