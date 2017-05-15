# LOAD
import time
import logging

def push(request_type, url, data, console):
    import ujson

    attempts = 0
    while attempts <= 0:
        if request_type == "POST":
            r = console.post(url,data=ujson.dumps(data))
            if r.json['response'].get("error",False):
                print r.json['response']['error']
                logging.info("opt - " + str(r.json['response']['error']))
            elif 'error_code' in r.json['response']:
                if r.json['response']['error_code'] == 'RATE_EXCEEDED':
                    print "rate exceeded, sleeping 60 seconds"
                    logging.info("opt - rate exceeded, sleeping 60 seconds")
                    time.sleep(60)
            elif r.json['response']['status'] == "OK":
                return r
            else:
                print r.json
                logging.info("opt - " + str(r.json))
                return r

        elif request_type == "PUT":
            r = console.put(url,data=ujson.dumps(data))
            if r.json['response'].get("error",False):
                print r.json['response']['error']
                logging.info("opt - " + str(r.json['response']['error']))

            elif 'error_code' in r.json['response']:
                if r.json['response']['error_code'] == 'RATE_EXCEEDED':
                    print "rate exceeded, sleeping 60 seconds"
                    logging.info("opt - rate exceeded, sleeping 60 seconds")
                    time.sleep(60)
            elif r.json['response']['status'] == "OK":
                return r
            else:
                print r.json
                logging.info("opt - " + str(r.json))
                return r
        attempts += 1
    print "Finished 1 attempts"

def create_campaign(advertiser,line_item,data,console,name=""):
    url = "/campaign?line_item=%s&advertiser_id=%s&logFilter=%s" % (line_item,advertiser,name)
    campaign = push("POST", url, data, console)
    try:
        return campaign.json['response']['campaign']['id']
    except:
        logging.info("opt - create_campaign failed")
        raise Exception("missing campaign_id ")


def create_profile(advertiser_id,data,console,name=""):
    url = "/profile?advertiser_id=%s&logFilter=%s" % (advertiser_id,name)

    profile = push("POST", url, data, console)

    try:
        return profile.json['response']['profile']['id']
    except:
        logging.info("opt - create_profile failed")
        raise Exception("missing profile_id ")

def update_campaign(advertiser_id,campaign_id,data,console,name=""):
    url = "/campaign?advertiser_id=%s&id=%s&logFilter=%s" % (advertiser_id,campaign_id,name)

    campaign = push("PUT", url, data, console)

    try:
        return campaign.json['response']['campaign']['id']
    except Exception as e:
        logging.info("opt - %s" %(str(e)))
        logging.info("opt - update campaign failed for %s"%campaign_id)
        raise Exception("missing campaign_id %s" %campaign_id)



def update_profile(advertiser_id,profile_id,data,console,name=""):
    url = "/profile?advertiser_id=%s&id=%s&logFilter=%s" % (advertiser_id,profile_id,name)

    profile = push("PUT", url, data, console)

    try:
        return profile.json['response']['profile']['id']
    except Exception as e:
        logging.info(e)
        logging.info("opt - update campaign failed for %s"%profile_id)
        raise Exception("missing profile_id %s" %profile_id)



def deactivate_campaigns(campaigns,_c,name=""):
    logging.info("opt - deactivating campaigns")
    import ujson
    for camp in campaigns:
        _c.put("/campaign?id=%s&logFilter=%s" % (camp,name), data=ujson.dumps({"campaign":{"state":"inactive"}}))
     


def push_campaigns(df,advertiser,line_item,name=""):
    logging.info("opt - pushing campaigns to appnexus")
    # PUSH to appnexus
    import ujson
    import time

    from link import lnk

    console = lnk.api.console

    for i,row in df.iterrows():

        print advertiser, line_item
        logging.info("opt - advertiser %s, line_item %s"%(advertiser, line_item))

        try:
            profile = {"profile":ujson.loads(row['profile']) }
            profile_id = create_profile(advertiser,profile,console,name)
            print " - profile: %s" % profile_id
            # logging.info(" - profile: %s" % profile_id)

            campaign = {"campaign": ujson.loads(row['campaign']) }
            campaign['campaign']['profile_id'] = profile_id
            campaign['campaign']['advertiser_id'] = advertiser
            campaign_id = create_campaign(advertiser,line_item,campaign,console,name)
            print " - campaign: %s" % campaign_id
            # logging.info("opt - campaign: %s" % campaign_id)
            time.sleep(1)

        except Exception as e:
            logging.info("opt - %s" %(str(e)))
            time.sleep(10)
            print "FAILED"
            logging.info("opt - FAILED") 

def update_campaigns(df,advertiser,name=""):
    # PUSH to appnexus
    import time
    logging.info("opt - updating campaigns")
    import ujson

    from link import lnk

    console = lnk.api.console

    for i,row in df.iterrows():

        print advertiser
        try:

            campaign_original = ujson.loads(row['original_campaign'])
            campaign_id = campaign_original['id']
            profile_id = campaign_original['profile_id']

            campaign = ujson.loads(row['campaign'])
            del campaign['line_item_id']
            data = {"profile":ujson.loads(row['profile']) }

            print " - campaign: %s" % campaign_id
            print " - profile: %s" % profile_id

            # logging.info("opt - campaign: %s" % campaign_id)
            # logging.info("opt - profile: %s" % profile_id)
            
            update_profile(advertiser,profile_id,data,console,name)
            update_campaign(advertiser,campaign_id,{"campaign":campaign},console,name)



            time.sleep(1)

        except Exception as e:
            logging.info("opt - %s" %(str(e)))
            
            time.sleep(10)
            print "FAILED" 
            logging.info("opt - FAILED") 

