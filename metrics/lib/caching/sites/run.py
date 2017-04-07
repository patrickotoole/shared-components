def process_endpoint(endpoint):
    return endpoint.replace('/crusher/dashboard','/crusher/v1/visitor/yoshi_mediaplan').replace('selected_action','filter_id') + '&prevent_sample=true&num_days=2'
 
def run(db, advertiser, pattern, limit=10):

    from link import lnk

    import requests
    import json
    import urllib
    import logging
    import math

    cr = lnk.api.crusher
    cr.base_url = "http://localhost:9001"
    cr.user = "a_%s" % advertiser
    cr.password = "admin"
    cr.authenticate()

    saved = cr.get("/crusher/saved_dashboard").json

    boards = []

    for dashboards in saved['response']:

        name = dashboards['name']
        endpoint = dashboards['endpoint']
        media_plan_endpoint = process_endpoint(endpoint)

        data = cr.get(media_plan_endpoint).json['domains'][:10]
        for d in data:
            d['importance'] = round(math.log(d['importance']),2)
      
        boards += [{"title":name,"value":data,"url":"http://hindsight.ai" + endpoint}]

        
    return json.dumps(boards).encode('latin', 'ignore')
    
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
