import pandas as pd
import numpy as np
import requests
import time
import json
from link import lnk
import copy
from link import lnk
console  = lnk.api.console

import logging
logger = logging.getLogger("opt")


def extract_admin_field(whois_raw, field):

    raw = whois_raw.split('\n')
    find_field = filter(lambda x: "Registrant Country" in x, raw)

    if len(find_field) == 1:

        split = find_field[0].split(':')
        if len(split) == 2:
            return split[1].replace(" ", "")
    return None


def get_domain_list(id):
    r = console.get("/domain-list?id=%s"%id)
    try:
        return r.json['response']['domain-list']['domains']
    except KeyError as e:
        logger.error("list %d doesn't exist" %id)


class DomainWhoisGeo():

    def __init__(self, list_id):
        
        self.list_id = list_id
        self.data = None
        self.good_countries = ['UnitedStates', 'US', 'UK', 'UnitedKingdom']
        self.rbox_api = lnk.api.rockerbox


    def load_data(self):
        r = requests.get("http://portal.getrockerbox.com/domains?format=json")
        self.data = pd.DataFrame(r.json())
        logger.info("Data loaded with %d domains" %len(self.data))


    def country_filter(self, country):
        return (country not in self.good_countries)

    def filter(self):
        self.data = self.data[self.data['whois_raw'] != 0]
        logger.info("Data filtered to %d domains with whois data" %len(self.data))
        
        self.data['admin_country'] = self.data['whois_raw'].apply(lambda x: extract_admin_field(x, 'Admin Country'))
        self.data['registrant_country'] = self.data['whois_raw'].apply(lambda x: extract_admin_field(x, 'Registrant Country'))
        
        logger.info("Filtering based on " +  str(self.good_countries))
        self.data = self.data[self.data['registrant_country'].apply(lambda x: self.country_filter(x))]
        logger.info("Data filtered to %d domains" % len(self.data))


    def push(self):

        logger.info("Pushing to domain list %d" %self.list_id)

        old_domain_list = get_domain_list(self.list_id)
        
        if old_domain_list is None:
            
            new_domain_list = []
            for domain in self.data['domain'].unique():
                new_domain_list.append(domain)
                logger.info("Adding %s" %domain)

        else:
            new_domain_list = copy.copy(old_domain_list)

            ## Adding domains that aren't already in the list
            for domain in self.data['domain'].unique():
                if domain not in old_domain_list:
                    new_domain_list.append(domain)
                    logger.info("Adding %s" %domain)


        log = {
                "rule_group_id": 6,
                "field_old_value": old_domain_list,
                "field_new_value": new_domain_list,
                "domain_list_id": self.list_id,
                "object_modified": "domain_list",
                "field_name": "domains",
                "metric_values": {}
            }

        r = self.rbox_api.post("/opt_log", data=json.dumps(log))
        logger.info("Push successful")




