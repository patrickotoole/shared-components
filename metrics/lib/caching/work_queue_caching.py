import action_dashboard_cache as adc
import logging

def get_connectors():
    from link import lnk
    return {
        "db": lnk.dbs.rockerbox,
        "zk": {},
        "cassandra": lnk.dbs.cassandra
    }

def run_domains_cache(advertiser,pattern,connectors=False):
    connectors = connectors or get_connectors()

    db = connectors['db']
    zk = connectors['zk']

    user_format = "a_{}"
    username = user_format.format(advertiser)
    AC = adc.ActionCache(username, "admin",db, zk)
    logging.info("Action Cache class instance created and initiated")
    adc.run_advertiser_segment(AC,username, pattern)
    logging.info("ran run advertiser segment for %s and %s" % (advertiser, pattern))

