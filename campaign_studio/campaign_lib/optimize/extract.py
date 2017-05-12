import logging
def get_campaign_profile_objects(df,_c,params):
    if params['create']:
        return get_campaigns_and_profiles_from_template(params['template_campaign'],df,_c)
    return get_campaigns_and_profiles(df,_c)

def get_campaigns_and_profiles_from_template(template,grouped,_c):
    template_campaign = pandas.DataFrame([{"campaign_id": template}])
    template_df = get_campaigns_and_profiles(template_campaign,_c)


    campaign = template_df.ix[0,'original_campaign']
    profile = template_df.ix[0,'original_profile']
    grouped['original_campaign'] = campaign
    grouped['original_profile'] = profile

    return grouped



def format_venue_targets(df):
    if "venue_id" in df.columns:
            df['venues'] = ",".join(map(str,df['venue_id'].unique()[df['venue_id'].unique() < 1000]))
    return df

def get_dma_targets(df):
    if "geo_dma_id" in df.columns and "geo_dma_name":
        df["geo_dma"] = df.apply(lambda x:  (x["geo_dma_name"],x["geo_dma_id"]), axis = 1)
    import ipdb; ipdb.set_trace()
    return df

def get_mobile_targets(df,_c):
    if "mobile_application_id" in df.columns and "os_family_id" in df.columns:
        import json
        from link import lnk 


        data = df[['mobile_application_id','os_family_id']].rename(columns={"mobile_application_id":"bundle_id"}).to_dict('records')
        ll, i, size = len(data), 0, 25

        bundles = []

        while i*size < ll:
            subset = data[i*size:(i+1)*size]
            _js = _c.post("/mobile-app-instance",data=json.dumps({"mobile-app-instances": subset })).json
            sub_bundle = [
                { 
                    "id":id, 
                    "mobile_application_id":j['instance-bundle'][0]['bundle_id'] 
                } 
                for id,j in _js['response']['mobile-app-instances'].items()
            ]
            bundles += sub_bundle
            i += 1

        bundles_df = pandas.DataFrame(bundles)
       
        df = df.merge(bundles_df,left_on="mobile_application_id",right_on="mobile_application_id")

    return df

def get_campaigns_and_profiles(df,_c):
    logging.info("opt - getting campaigns and profiles")
    assert "campaign_id" in df.columns

    import ujson
    import time
    df['original_campaign'] = ""

    for i,row in df.iterrows():
        try:
            campaign = _c.get("/campaign?id=%s" % row.campaign_id).json['response']['campaign']
            profile = _c.get("/profile?id=%s" % campaign['profile_id']).json['response']['profile']
            df.ix[i,'original_campaign'] = ujson.dumps(campaign)
            df.ix[i,'original_profile'] = ujson.dumps(profile)
            print "got: %s" % row.campaign_id
            # logging.info("opt - got: %s" % row.campaign_id)
            time.sleep(1.5)
        except:

            print "failed: %s" % row.campaign_id
            logging.info("opt - failed: %s" % row.campaign_id)
            print "sleeping 30"
            logging.info("opt - get_campaigns_and_profiles sleeping 30")
            time.sleep(30)
            print "slept"
            logging.info("opt - get_campaigns_and_profiles slept")

            try:
                campaign = _c.get("/campaign?id=%s" % row.campaign_id).json['response']['campaign']
                profile = _c.get("/profile?id=%s" % campaign['profile_id']).json['response']['profile']
                df.ix[i,'original_campaign'] = ujson.dumps(campaign)
                df.ix[i,'original_profile'] = ujson.dumps(profile)
            except:

                print "failed: %s" % row.campaign_id
                logging.info("failed: %s" % row.campaign_id)
                pass

    return df


SUPPORTED_COLS = ["campaign_id","placement_id","venue_id","segment_id","seller_id","site_domain","seller_member_name","geo_dma"]
AGG_TO_GROUP = lambda x: list(set(x))

def get_cols(df):
    return [c for c in SUPPORTED_COLS if c in df.columns]

def build_agg_funcs(df,groupby):
    cols = get_cols(df)
    aggs = { k: AGG_TO_GROUP for k in cols if k != groupby }

    return aggs

def run_agg(df,groupby,aggs):
    import ipdb; ipdb.set_trace()
    cols = get_cols(df)
    df = df[cols].set_index(groupby)

    if len(aggs) > 0:
        df = df.reset_index().groupby(groupby).agg(aggs)

    df = df.reset_index()
    return df

 
