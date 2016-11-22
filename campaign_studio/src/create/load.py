# LOAD
import time

def push(request_type, url, data, console):
    import ujson

    attempts = 0
    while attempts <= 0:
        if request_type == "POST":
            r = console.post(url,data=ujson.dumps(data))
            if r.json['response'].get("error",False):
                print r.json['response']['error']
            elif 'error_code' in r.json['response']:
                if r.json['response']['error_code'] == 'RATE_EXCEEDED':
                    print "rate exceeded, sleeping 60 seconds"
                    time.sleep(60)
            elif r.json['response']['status'] == "OK":
                return r
            else:
                print r.json
                return r

        elif request_type == "PUT":
            r = console.put(url,data=ujson.dumps(data))
            if r.json['response'].get("error",False):
                print r.json['response']['error']

            elif 'error_code' in r.json['response']:
                if r.json['response']['error_code'] == 'RATE_EXCEEDED':
                    print "rate exceeded, sleeping 60 seconds"
                    time.sleep(60)
            elif r.json['response']['status'] == "OK":
                return r
            else:
                print r.json
                return r
        attempts += 1
    print "Finished 1 attempts"

def create_campaign(advertiser,line_item,data,console):
    url = "/campaign?line_item=%s&advertiser_id=%s" % (line_item,advertiser)
    campaign = push("POST", url, data, console)

    return campaign.json['response']['campaign']['id']

def create_profile(advertiser_id,data,console):
    url = "/profile?advertiser_id=%s" % (advertiser_id)

    profile = push("POST", url, data, console)

    try:
        return profile.json['response']['profile']['id']
    except:
        raise Exception("missing profile_id ")

def update_profile(advertiser_id,profile_id,data,console):
    url = "/profile?advertiser_id=%s&id=%s" % (advertiser_id,profile_id)

    profile = push("PUT", url, data, console)

    try:
        return profile.json['response']['profile']['id']
    except:
        raise Exception("missing profile_id ")



def deactivate_campaigns(campaigns,_c):

    import ujson

    for camp in campaigns:
        _c.put("/campaign?id=%s" % camp, data=ujson.dumps({"campaign":{"state":"inactive"}}))
     


def push_campaigns(df,advertiser,line_item):
    import ipdb; ipdb.set_trace()
    # PUSH to appnexus
    import ujson

    from link import lnk

    console = lnk.api.console

    for i,row in df.iterrows():

        print advertiser, line_item
        try:
            profile = {"profile":ujson.loads(row['profile']) }
            profile_id = create_profile(advertiser,profile,console)
            print " - profile: %s" % profile_id

            campaign = {"campaign": ujson.loads(row['campaign']) }
            campaign['campaign']['profile_id'] = profile_id
            campaign['campaign']['advertiser_id'] = advertiser
            campaign_id = create_campaign(advertiser,line_item,campaign,console)
            print " - campaign: %s" % campaign_id
            time.sleep(1)

        except:

            import time
            time.sleep(10)
            print "FAILED" 

def update_profiles(df,advertiser):
    import ipdb; ipdb.set_trace()
    # PUSH to appnexus
    import ujson

    from link import lnk

    console = lnk.api.console

    for i,row in df.iterrows():

        print advertiser
        try:
            
            campaign = ujson.loads(row['original_campaign'])
            data = {"profile":ujson.loads(row['profile']) }
            campaign_id = campaign['id']
            profile_id = campaign['profile_id']

            print " - campaign: %s" % campaign_id
            print " - profile: %s" % profile_id
            
            update_profile(advertiser,profile_id,data,console)


            time.sleep(1)

        except:

            import time
            time.sleep(10)
            print "FAILED" 

