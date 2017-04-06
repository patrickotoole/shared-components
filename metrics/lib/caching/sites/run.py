def process_endpoint(endpoint):
    return endpoint.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id') + '&prevent_sample=true&num_days=2'
 
def run(db, advertiser, pattern, limit=10):

    from link import lnk

    import requests
    import json
    import urllib
    import logging

    cr = lnk.api.crusher
    cr.base_url = "http://localhost:9001"
    cr.user = "a_%s" % advertiser
    cr.password = "admin"
    cr.authenticate()

    saved = cr.get("/crusher/saved_dashboard").json
    endpoint = saved['response'][1]['endpoint']
    media_plan_endpoint = process_endpoint(endpoint)

    print media_plan_endpoint

    #data = cr.get(media_plan_endpoint).json
    data = []

    

        
    return json.dumps(data).encode('latin', 'ignore')
    
if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("limit", default=10)
    #define("run_local", default=True)
    #define("filter_id", default=0)
    #define("base_url", default="http://beta.crusher.getrockerbox.com")

    basicConfig(options={})
    parse_command_line()

    from link import lnk
    db = lnk.dbs.crushercache
    print run(db, options.advertiser, options.pattern, options.limit)
