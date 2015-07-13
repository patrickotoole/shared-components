import warnings
from link import lnk
import numpy as np
import json
import copy
from datetime import datetime
warnings.filterwarnings('ignore')

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

class FunnelMongoAPI:
    def __init__(self, tree):
        self.mongo = lnk.dbs.mongo.rockerbox
        self.api = lnk.api.console
        self.tree = tree

    def get_new_segment(self, name):
        logger.info("Requesting new segment with name: {}".format(name))
        to_post = {
            "segment":{
                "member_id": 2024,
                "short_name": name
            }
        }
        r = self.api.post("/segment", data=json.dumps(to_post))
        segment_id = r.json["response"]["segment"]["id"]
        return segment_id

    def insert_domain(self, domain):
        return self.mongo.domains.insert_one({"domain": domain})

    def find_domain(self, domain):
        return self.mongo.domains.find_one({"domain": domain})        

    def update_domain_segment(self, domain, segment_id):
        logger.info("Updating domain entry in MongoDB: {}".format(domain))
        search_filter = {"domain":domain}
        updated = {"$set": {"segment_id": segment_id}}
        r = self.mongo.domains.update_one(search_filter, updated)
        return r

    def domain_to_segment(self, domain):
        # Check if we already have a segment for this domain
        r = self.find_domain(domain)

        if not r or "segment_id" not in r:
            if not r:
                self.insert_domain(domain)
            segment_id = self.get_new_segment("Delorean - {}".format(domain))
            updated = self.update_domain_segment(domain, segment_id)
            return segment_id
        else:
            return r["segment_id"]

    def insert_diff(self, advertiser, funnel_name, orig, new):
        from datadiff import diff

        difference = diff(orig["branches"], new["branches"])
        dt = datetime.utcnow()

        search_filter = {
            "name":funnel_name, 
            "advertiser":advertiser,
        }

        new_diff = {
            "diff":str(difference), 
            "datetime":dt
        }

        if difference:
            r = self.mongo.funnel_campaigns_diff.update_one(search_filter, {"$push": {"diffs": new_diff}}, upsert=True)

    def rules_to_query(self, advertiser, funnel_name, funnel_id):
        branches = copy.deepcopy(self.tree.branches)

        for branch in branches:
            for rule in branch["rules"]:
                rule["segment"] = self.domain_to_segment(rule["domain"])
        obj = {
            "funnel_id": funnel_id,
            "advertiser": advertiser, 
            "name": funnel_name,
            "branches": branches
        }

        search_filter = {"advertiser":advertiser, "funnel_id": funnel_id}

        found = self.mongo.funnel_campaigns.find_one(search_filter)

        if not found:
            logger.info(self.mongo.funnel_campaigns.insert_one(obj).inserted_id)
        else:
            del found["_id"]
            # Update entry and send diff
            r = self.mongo.funnel_campaigns.update_one(search_filter, {"$set": obj})
            logger.info(r.modified_count)
            self.insert_diff(advertiser, funnel_name, found, obj)

    # What do we want to include in each recommendation? We need to know how
    # many users fall into the 
    def insert_funnel_recs(self, advertiser, recs):
        to_insert = {"advertiser":advertiser, "funnel_recs":recs}
        return self.mongo.funnel_recs.insert_one(to_insert)
