import boto
from datetime import datetime
from boto.s3.connection import S3Connection
from slackclient import SlackClient

def get_s3():
    conn = S3Connection('AKIAIVMCHBYD327UXDVA', 'fjdNMx6Pw3iD19z+79n83UMes0zhiMDEmknZCAlO')
    return conn

def get_slack():
    token = "xoxb-6465676919-uuZ6eLwx0fjJ5JTxTa3yAvMD"
    sc = SlackClient(token)

    sc.rtm_connect()
    return sc

def time_since(t, format_str="%Y-%m-%dT%H:%M:%S.000Z", kind="hours"):
    diff = datetime.now() - datetime.strptime(t, format_str)
    if kind == "hours":
        return (diff.days * 24) + (diff.seconds / 60.0 / 60.0)
    elif kind == "minutes":
        return (diff.days * 24 * 60) + (diff.seconds / 60.0)
    elif kind == "seconds":
        return (diff.days * 24 * 60 * 60) + diff.seconds
