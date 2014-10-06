import requests 
import ujson
import logging


RB_API_BASE = "/advertiser/viewable/reporting"
URL = RB_API_BASE + "?meta=none&include=domain&type=%s&date=%s&format=json&campaign=%s" 

LOGGING_SQL = "INSERT INTO domain_list_change_ref %(fields)s VALUES %(values)s"

class DomainAPI(object):
    def __init__(self,api,rb,db):
        self.an_api = api
        self.rb_api = rb
        self.db = db

    def pull_campaign_ids(self,line_item_id):
        logging.info("AppNexus API line-item request: %s" % line_item_id)

        response = self.an_api.get("/line-item?id=%s" % line_item_id)
        self.advertiser_id = response.json["response"]["line-item"]["advertiser_id"]
        campaign_list = response.json["response"]["line-item"]["campaigns"]
        campaign_id_list = [c["id"] for c in campaign_list]
        
        logging.info("AppNexus API campaigns received: %s" % campaign_id_list)
        return campaign_id_list

    def get_existing_domains(self,domain_list_id):
        response = self.an_api.get("/domain-list?id=%s" % domain_list_id)
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
        
    @classmethod
    def add_acct_to_df(self,domains,ext_domain_list_id,domain_list,action):

        domains["external_domain_list_id"] = ext_domain_list_id
        domains["domain_list"] = domain_list
        domains["action"] = action

        return domains

    def update_domain_list(self,domains,ext_domain_list_id,domain_list,action):

        domains = self.add_acct_to_df(domains,ext_domain_list_id,domain_list,action)
        
        existing_domains = self.get_existing_domains(ext_domain_list_id)
        all_domains = list(set(existing_domains + list(domains.index)))
        new_domains = [d for d in all_domains if d not in existing_domains]

        self.log_domain_change(domains.ix[new_domains])

        logging.info("Modifying AppNexus domain list %s: %s %s" % 
            (ext_domain_list_id,len(existing_domains),len(all_domains))
        )

        obj = {"domain-list":{"domains":all_domains}}
        put_response = self.an_api.put("/domain-list?id=%s" % ext_domain_list_id, ujson.dumps(obj))

    def get_domain_list(self,domain_list):
        domains = self.rb_api.get_report("/advertiser/domain_list/streaming?format=json&log=%s" % domain_list)
        
        domain_count = len(domains)
        logging.info("Domains on list %s: %s" % (domain_list,domain_count))
        return domains
        
    def get_viewability_df(self,domain_list,duration="past_month"):
        
        campaign_ids = self.campaign_ids
        
        campaign_string = ",".join(map(str,campaign_ids))
        compiled_url = URL % (domain_list,duration,campaign_string)

        logging.info("Rockerbox API request for %s (%s): %s" % (domain_list,duration,campaign_string)) 

        df = self.rb_api.get_report(compiled_url)
        logging.info("Rockerbox API lines received: %s" % len(df))
         
        return df
 
