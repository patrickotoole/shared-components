def setup(rb,crushercache):
    
    Q = "SELECT a.action_id, url_pattern FROM action_patterns ap JOIN action a ON a.action_id = ap.action_id where a.pixel_source_name = '%s' and a.active = 1 and a.deleted = 0"

    def _setup(advertiser,segments,udf):
        import pandas
        action = pandas.DataFrame([[x['pattern'],x['filter_id']] for x in segments['segments'] if x['data_populated'] ==1])
        action.columns=['url_pattern', 'action_id']
        params = {}
        
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
            "skip_datasets":"corpus"
        }
        
        TO_POST = {i:j for i,j in to_post.items() + params.items()}
        return TO_POST

    return _build

if __name__ == "__main__":

    import time
    import requests
    import ujson 
    from link import lnk
    rb = lnk.dbs.rockerbox
    crushercache = lnk.dbs.crushercache

    env = setup(rb,crushercache)

    udf = "testing_category"

    wq_url = "http://workqueue.crusher.getrockerbox.com/cache"
    base_url = "http://beta.crusher.getrockerbox.com"

    #wq_url = "http://localhost:9001/cache" 
    #base_url = "http://localhost:8888" 

    data = requests.get("http://portal.getrockerbox.com/admin/pixel/advertiser_data?skip=True",auth=("rockerbox","RBOXX2017"))
    valid_advertisers = {x:y for x,y in data.json().items() if y['has_data'] and len([z for z in y['segments'] if z['data_populated']==1]) >0 }
    for advertiser, segments in valid_advertisers.items():

        variables = env(advertiser,segments,udf)

        builder = build_post(udf,advertiser,variables["params"],base_url)
        built = variables["actions"].T.apply(lambda x: [builder(x.action_id,x.url_pattern)] )
        
        if len(built.T):
            import requests
            import json

            for i in built.tolist()[:1]:
                obj = i[0]
                print obj
                print requests.post(wq_url,data=json.dumps(obj),auth=("rockerbox","RBOXX2017")).content

    
