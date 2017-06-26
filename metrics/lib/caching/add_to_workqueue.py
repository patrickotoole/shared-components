def setup(rb,crushercache):
    
    Q = "SELECT a.action_id, url_pattern FROM action_patterns ap JOIN action a ON a.action_id = ap.action_id where a.pixel_source_name = '%s' and a.active = 1 and a.deleted = 0"

    def _setup(advertiser,segments,udf):
        import pandas
        action = pandas.DataFrame([[x['pattern'],x['filter_id']] for x in segments['segments'] if x['data_populated'] ==1])
        action.columns=['url_pattern', 'action_id']
        params = {}

        return {"params":params, "actions":action}

        
        

    return _setup
    

def build_post(udf,advertiser,params,base_url, params_obj):

    def _build(filter_id,pattern):
        to_post = [z['parameters'] for z in params_obj if z['action_id'] ==filter_id][0]
        to_post['udf'] = udf
        to_post['advertiser'] = advertiser
        to_post['filter_id'] = filter_id
        to_post['pattern'] = pattern
        to_post['priority'] = 35
        to_post['base_ur;'] = base_url 
        
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

    udf = "domains_full_time_minute"

    #wq_url = "http://workqueue.crusher.getrockerbox.com/cache"
    #base_url = "http://beta.crusher.getrockerbox.com"

    wq_url = "http://localhost:8888/cache" 
    base_url = "http://localhost:9001" 

    data = requests.get("http://portal.getrockerbox.com/admin/pixel/advertiser_data?skip=True",auth=("rockerbox","RBOXX2017"))
    valid_advertisers = {x:y for x,y in data.json().items() if y['has_data'] and len([z for z in y['segments'] if z['data_populated']==1]) >0 }
    for advertiser, segments in valid_advertisers.items():

        variables = env(advertiser,segments,udf)
        api_wrapper = lnk.api.crusher
        api_wrapper.user="a_{}".format(advertiser)
        api_wrapper.base_url = base_url
        api_wrapper.authenticate()
        params_resp = api_wrapper.get("/crusher/funnel/action?format=json")

        params_obj = params_resp.json['result'] 

        builder = build_post(udf,advertiser,variables["params"],base_url, params_obj)
        built = variables["actions"].T.apply(lambda x: [builder(x.action_id,x.url_pattern)] )
        
        if len(built.T):
            import requests
            import json

            for i in built.tolist():
                obj = i[0]
                print obj
                print requests.post(wq_url,data=json.dumps(obj),auth=("rockerbox","RBOXX2017")).content

    
