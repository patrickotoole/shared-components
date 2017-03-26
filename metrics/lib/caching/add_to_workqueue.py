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
    

def build_post(udf,advertiser,params):

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
            "priority":2
        }
        
        TO_POST = {i:j for i,j in to_post.items() + params.items()}
        print TO_POST
        return TO_POST

    return _build

if __name__ == "__main__":

    
    from link import lnk
    rb = lnk.dbs.rockerbox
    crushercache = lnk.dbs.crushercache

    env = setup(rb,crushercache)

    advertiser = "fsastore"
    udf = "domains_full_time_minute"
    url = "http://localhost:9001/cache" #"http://workqueue.crusher.getrockerbox.com/cache"

    variables = env(advertiser,udf)

    builder = build_post(udf,advertiser,variables["params"])
    built = variables["actions"].T.apply(lambda x: [builder(x.action_id,x.url_pattern)] )
    
    import requests
    import json

    for i in built.tolist()[:1]:
        obj = i[0]
        requests.post(url,data=json.dumps(obj))


    
