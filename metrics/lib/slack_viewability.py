import pandas
import time
import ujson
from link import lnk
from slackclient import SlackClient

token = "xoxb-6465676919-uuZ6eLwx0fjJ5JTxTa3yAvMD"
url = "/advertiser/viewable/reporting?format=json&include=date&date=past_week&advertiser_equal=%s&meta=none&include=campaign,date&fields=loaded,served,visible"
advertiser_query = """select external_advertiser_id, pixel_source_name, media_trader_slack_name from advertiser where active = 1 and deleted = 0 and running = 1"""

template = "The following <http://portal.getrockerbox.com/admin/advertiser/%(advertiser_id)s|%(advertiser)s> campaigns have a low visibility rating and need your attention: \n ```%(content)s```"

subtemplate = "Loaded: %(percent_loaded)s,  Visible: %(percent_visible)s -- <http://console.appnexus.com/v2/campaign:%(campaign)s/show|%(campaign_name)s> (%(campaign)s)"

users = {}

def get_slack_user(sc,name):
    did = users.get(name,False)
    if not did:
        uid = [i['id'] for i in ujson.loads(sc.api_call("users.list"))['members'] if i['name'] == name][0]
        did = ujson.loads(sc.api_call("im.open",user=uid))['channel']['id']
        users[name] = did
    return did

def run_advertiser(sc,advertiser_id,advertiser,slack_user):
    print "Evaluating: %s" % advertiser
    
    data = lnk.api.rockerbox.get(url % advertiser)
    df = pandas.DataFrame(data.json)

    did = get_slack_user(sc,slack_user)
    
    if len(df):
    
        summed = df.groupby("campaign").sum().reset_index()
        summed['campaign_id'] = summed.campaign.map(int)
        summed = summed.set_index("campaign_id")
        summed['percent_loaded'] = summed['loaded']/summed['served']
        summed['percent_visible'] = summed['visible']/summed['served']

        introuble = summed[(summed.loaded > 10) & ((summed.loaded/summed.served < .5) | (summed.visible/summed.loaded < .4))]
        introuble_ids = ",".join(introuble.campaign)
                
        if len(introuble_ids):

            active_campaign_names = lnk.dbs.rockerbox.select_dataframe("select campaign_id, campaign_name from advertiser_campaign where campaign_id in (%s) and active = 1" % introuble_ids)
            active_campaign_names['campaign_id'] = active_campaign_names.campaign_id.map(int)
            active_campaign_names = active_campaign_names.set_index("campaign_id")

            notify = active_campaign_names.join(introuble,how="left")

            if len(notify):
                text = template % {
                    "advertiser": advertiser,
                    "advertiser_id": advertiser_id,
                    "content":"\n".join([subtemplate % i for i in notify.T.to_dict().values()])
                }
                print "sending %s %s notifications" % (slack_user, advertiser)
                sc.api_call("chat.postMessage",channel=did,text=text,as_user=True)
                
                
if __name__ == "__main__":
    advertisers = lnk.dbs.rockerbox.select_dataframe(advertiser_query)
    sc = SlackClient(token)
    for i,l in list(advertisers.iterrows()):
        run_advertiser(sc,l.external_advertiser_id,l.pixel_source_name,l.media_trader_slack_name)
