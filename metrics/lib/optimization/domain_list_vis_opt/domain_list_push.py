import pandas as pd
import numpy as np
import requests
import json
from link import lnk
import copy
from link import lnk
console  = lnk.api.console

import logging
logger = logging.getLogger("opt")



def get_domain_list(id):
    r = console.get("/domain-list?id=%s"%id)
    try:
        return r.json['response']['domain-list']['domains']
    except KeyError as e:
        logger.error("list %d doesn't exist" %id)


class DomainVisPush:

    def __init__(self, list_id, metric, cutoff):
        
        self.list_id = list_id
        self.metric = metric # visibility ratio/loaded ratio / etc
        self.cutoff = cutoff
        self.rbox_api = lnk.api.rockerbox
        self.data = None


    def load_data(self):
        r = requests.get("http://portal.getrockerbox.com/domains?format=json")
        self.data = pd.DataFrame(r.json())
        logger.info("Data loaded with %d domains" %len(self.data))

    def filter(self):

        self.data = self.data[(self.data[self.metric] > 0) & 
                        (self.data[self.metric] < self.cutoff) ]
        logger.info("Filtered to with %d domains" %len(self.data))

        logger.info("min, max: %f, %f" %(self.data[self.metric].min(), self.data[self.metric].max() )    )


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
        logger.info("Push to list %d successful"%self.list_id)





