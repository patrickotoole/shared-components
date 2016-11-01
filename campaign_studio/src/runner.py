from extract import *
from transform import *
from load import *

import ujson

def load_json(s):
    try:
        return ujson.loads(s)
    except:
        return s

def runner(CAMPAIGN_TYPE,LINE_ITEM,ADVERTISER,data,fields):

    from link import lnk
    db = lnk.dbs.rockerbox

    CAP = 10

    #NAMER = lambda x: "From Advertiser Report " + x.get('mobile_application_id',x.get('placement_id',x.get('venue_id'," "))) + " : " + str(x['ctr']*100)[:5] + " Imps: " + str(x['imps'])
    NAMER = lambda x: "Mobile App: " + x.get("mobile_application_id","")

    filters = {
        "x": lambda row: True
    }

    import pandas

    df = pandas.DataFrame(data)
    df = filter(filters,df)

    #print len(df)
    #df = df.drop_duplicates(["placement_id"])
    #print len(df)

    df = df[df.isnull().T.sum() < 5]

    df['os_family_id'] = df['mobile_application_id'].map(lambda x: 3 if x.isdigit() else 2)

 
    if len(df):
        if "mobile_application_id" in df.columns and "os_family_id" in df.columns:
            import json
            from link import lnk 

            _c = lnk.api.console

            data = df[['mobile_application_id','os_family_id']].rename(columns={"mobile_application_id":"bundle_id"}).to_dict('records')
            ll, i, size = len(data), 0, 25

            bundles = []

            while i*size < ll:
                subset = data[i*size:(i+1)*size]
                _js = _c.post("/mobile-app-instance",data=json.dumps({"mobile-app-instances": subset })).json
                sub_bundle = [{"id":id,"mobile_application_id":j['instance-bundle'][0]['bundle_id']} for id,j in _js['response']['mobile-app-instances'].items()]
                bundles += sub_bundle
                i += 1

            bundles_df = pandas.DataFrame(bundles)
           
            df = df.merge(bundles_df,left_on="mobile_application_id",right_on="mobile_application_id")

                

        if "venue_id" in df.columns:
            df['venues'] = ",".join(map(str,df['venue_id'].unique()[df['venue_id'].unique() < 1000]))

        df['max_day_imps'] = CAP
        df['max_lifetime_imps'] = CAP
        df['line_item'] = LINE_ITEM


        profile_templates = { field: load_json(load_profile_template(db,field,CAMPAIGN_TYPE)) for field in fields }
        campaign_template = load_campaign_template(db,CAMPAIGN_TYPE)

        import json

        df['profile_template'] = ujson.dumps(profile_templates)
        df['campaign_template'] = campaign_template

        df['name'] = df.apply(NAMER, axis=1)

        create_profiles(df)
        create_campaigns(df)

        push_campaigns(df,ADVERTISER,LINE_ITEM)
