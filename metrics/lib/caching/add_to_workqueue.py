def setup(rb,crushercache):

    Q = "SELECT a.action_id, url_pattern FROM action_patterns ap JOIN action a ON a.action_id = ap.action_id where a.pixel_source_name = '%s' and a.active = 1 and a.deleted = 0"

    UDFQ = "SELECT parameters FROM user_defined_functions where udf = '%s' and advertiser = '%s'"

    def _setup(advertiser,udf):
        action = rb.select_dataframe(Q % advertiser)
        udf_params = crushercache.select_dataframe(UDFQ % (udf,advertiser) )
        params = {}
        if len(udf_params):
            import json
            params = json.loads(udf_params.ix[0,"parameters"])

        return {"params":params, "actions":action}

        
        

    return _setup
    

def build_post(udf,advertiser,params,base_url):

    def _build(filter_id,pattern):
        to_post = {
            "udf": udf,
            "advertiser": advertiser,
            "filter_id": filter_id,
            "pattern": pattern,
            "submitted_by": "add_to_workqueue.py",
            "num_days": 2,
            "prevent_sample": "true",
            "num_users": 25000,
            "priority": 35,
            "base_url":base_url,
            "skip_datasets":"uid_urls,url_to_action,corpus,domains"
        }
        
        TO_POST = {i:j for i,j in to_post.items() + params.items()}
        return TO_POST

    return _build

if __name__ == "__main__":

    import time
    from link import lnk
    rb = lnk.dbs.rockerbox
    crushercache = lnk.dbs.crushercache

    env = setup(rb,crushercache)

    udf = "domains_full_time_minute"
    wq_url = "http://localhost:8888/cache" 
    base_url = "http://localhost:9001" 

    #wq_url = "http://workqueue.crusher.getrockerbox.com/cache"
    #base_url = "http://beta.crusher.getrockerbox.com"

    #wq_url = "http://localhost:9001/cache" 
    #base_url = "http://localhost:8888" 

    #for advertiser in rb.select_dataframe("select pixel_source_name from rockerbox.advertiser where crusher=1 and deleted=0 ").pixel_source_name:
    for advertiser in rb.select_dataframe("select pixel_source_name from rockerbox.advertiser where crusher=1 and deleted=0 ").pixel_source_name:


        variables = env(advertiser,udf)

        builder = build_post(udf,advertiser,variables["params"],base_url)
        built = variables["actions"].T.apply(lambda x: [builder(x.action_id,x.url_pattern)] )
        
        if len(built.T):
            import requests
            import json

            for i in built.tolist()[:1]:
                obj = i[0]
                print obj
                print requests.post(wq_url,data=json.dumps(obj),auth=("rockerbox","RBOXX2017")).content
                import ipdb ; ipdb.set_trace()

    
