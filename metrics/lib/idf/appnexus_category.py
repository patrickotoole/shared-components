import pandas 
import json
import logging

class AppnexusCategory(object):

    def __init__(self,api):
        self.api = api

    def get_categories(self,category_ids):
        
        cat_ids_str = ",".join(category_ids)
        json = self.api.get("/content-category?category_type=universal&id={}".format(cat_ids_str)).json

        categories = json.get("response",{}).get("content-categories",[])
        return pandas.DataFrame(categories)

    def get_domain_category(self,domains):
        
        as_json = json.dumps({'urls':domains})
        try:
            response = self.api.post("/url-audit-search", data=as_json).json['response']['urls']
        except Exception as e:
            response = []
            print e
            
    
        domain_categories = [
            {"domain": i["url"], "category": i["content_category_id"]} 
            for i in response
            if "content_category_id" in i
        ]

        return pandas.DataFrame(domain_categories)
    

    def get_domain_category_name(self,domains):
        COLUMNS = ['domain','category_name','parent_category_name']

        logging.info("Pulling domains: %s" % domains)
        domain_df = self.get_domain_category(domains)
        
        domain_df = domain_df.dropna()
        if len(domain_df) == 0:
            return pandas.DataFrame([[0,0,0]],columns=COLUMNS).ix[100:]

        category_ids = domain_df.category.dropna().map(int).map(str).tolist()

        logging.info("Pulling categories: %s" % category_ids)
        category_df = self.get_categories(category_ids)

        if len(category_df) ==0:
            return pandas.DataFrame([[0,0,0]],columns=COLUMNS).ix[100:]

        merged = domain_df.merge(category_df,left_on="category",right_on="id")
        merged['category_name'] = merged['name'] 
        merged['parent_category_name'] = merged['parent_category'].map(lambda x: x['name'] if x else "")

        logging.info("%s/%s domains matched" % ( len(domains), len(merged) )) 

        return merged[COLUMNS]

if __name__ == "__main__":

    from link import lnk
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('domains', default=["rockerbox.com"], type=str, multiple=True)

    parse_command_line()
    basicConfig(options=options)

    console = lnk.api.console

    ac = AppnexusCategory(console)
    ac.get_domain_category_name(options.domains)
