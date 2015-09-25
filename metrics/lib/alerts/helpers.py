import boto
import ujson
from lib.helpers import Convert
from link import lnk
from datetime import datetime
from boto.s3.connection import S3Connection
from slackclient import SlackClient

ADVERTISER_QUERY = """
select
    advertiser_name,
    external_advertiser_id,
    media_trader_slack_name,
    pixel_source_name
from advertiser
where media_trader_slack_name is not null and running=1
"""

def get_marathon():
    return lnk.api.marathon

def get_cassandra():
    return lnk.dbs.cassandra

def get_mysql():
    return lnk.dbs.rockerbox

def get_rockerbox():
    return lnk.api.rockerbox

def get_s3():
    conn = S3Connection('AKIAIVMCHBYD327UXDVA', 'fjdNMx6Pw3iD19z+79n83UMes0zhiMDEmknZCAlO')
    return conn

def get_slack():
    token = "xoxb-6465676919-uuZ6eLwx0fjJ5JTxTa3yAvMD"
    sc = SlackClient(token)

    sc.rtm_connect()
    return sc

def get_slack_user(name, sc, cache={}):
    did = cache.get(name,False)
    if not did:
        uid = [i['id'] for i in ujson.loads(sc.api_call("users.list"))['members'] if i['name'] == name][0]
        did = ujson.loads(sc.api_call("im.open",user=uid))['channel']['id']
        cache[name] = did
    return did

def get_slack_channel(name, sc, cache={}):
    did = cache.get(name,False)
    if not did:
        did = [i['id'] for i in ujson.loads(sc.api_call("channels.list"))['channels'] if i['name'] == name][0]
        cache[name] = did
    return did


def time_since(t, format_str="%Y-%m-%dT%H:%M:%S.000Z", kind="hours"):
    diff = datetime.now() - datetime.strptime(t, format_str)
    if kind == "hours":
        return (diff.days * 24) + (diff.seconds / 60.0 / 60.0)
    elif kind == "minutes":
        return (diff.days * 24 * 60) + (diff.seconds / 60.0)
    elif kind == "seconds":
        return (diff.days * 24 * 60 * 60) + diff.seconds

def get_advertisers(mysql):
    df = mysql.select_dataframe(ADVERTISER_QUERY)
    advertisers = Convert.df_to_values(df)
    return advertisers

def advertiser_to_media_trader(mysql):
    key = {}
    advertisers = get_advertisers(mysql)
    for a in advertisers:
        key[a["pixel_source_name"]] = a["media_trader_slack_name"]
    return key
