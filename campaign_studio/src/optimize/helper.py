
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

def format_venue_targets(df):
    if "venue_id" in df.columns:
            df['venues'] = ",".join(map(str,df['venue_id'].unique()[df['venue_id'].unique() < 1000]))
    return df

def get_campaigns_and_profiles(df,_c):

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
            time.sleep(1.5)
        except:

            print "failed: %s" % row.campaign_id
            print "sleeping 30"
            time.sleep(30)
            print "slept"

            try:
                campaign = _c.get("/campaign?id=%s" % row.campaign_id).json['response']['campaign']
                profile = _c.get("/profile?id=%s" % campaign['profile_id']).json['response']['profile']
                df.ix[i,'original_campaign'] = ujson.dumps(campaign)
                df.ix[i,'original_profile'] = ujson.dumps(profile)
            except:

                print "failed: %s" % row.campaign_id
                pass


    return df
