import requests 
import ujson
import logging

RB_API_BASE = "http://rockerbox:rockerbox@portal.getrockerbox.com/admin/advertiser/viewable/reporting"
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
 
