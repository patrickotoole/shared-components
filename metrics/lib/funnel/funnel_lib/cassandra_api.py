from link import lnk
import pandas as pd
from query import *
import ast

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()


class FunnelAPI:
    def __init__(self):
        self.c = lnk.dbs.cassandra
        self.db = lnk.dbs.rockerbox
        self.h = lnk.dbs.hive
        self.BAD_DOMAINS = [
            "-",
            "",
            "NA",
            "microsoftadvertisingexchange.com",
            "tpc.googlesyndication.com",
            "collective-exchange.com",
            "ib.adnxs.com",
            "nym1.ib.adnxs.com"
            ]

    def get_pop_domains(self):
        logger.info("Getting population data...")
        pop = pd.DataFrame(self.h.execute(GET_POP))
        pop.domains = pop.domains.apply(ast.literal_eval)
        return pop
    
    def get_funnel_domains(self, funnel_name, advertiser):
        patterns = self.get_patterns(funnel_name=funnel_name)
        advertiser_urls = self.get_urls(advertiser)
        
        
        logger.info("PATTERNS: {}".format(patterns))

        uids = self.get_uids_updated(patterns, advertiser_urls)
        
        logger.info("Number of uids: {}".format(len(uids)))
        
        domains = self.get_domains(uids)
        return domains

    def get_funnels(self):
        funnels = self.db.select_dataframe(GET_FUNNELS)
        funnels = funnels[["pixel_source_name", "funnel_name", "funnel_id"]]
        funnels = [tuple(x) for x in funnels.values]
        return funnels

    def get_patterns(self, funnel_name=None, segment_id=None, step=None):
        where = "1=1"

        if funnel_name:
            where = where + " and a.funnel_name = '{}'".format(funnel_name)

        if segment_id:
            where = where + " and a.segment_id = {}".format(segment_id)

        if step:
            where = where + " and b.order <= {}".format(step)

        q = GET_PATTERNS.format(where)
        logger.info("Executing query: {}".format(q))
        
        r = self.db.select_dataframe(q)
        grouped = r.groupby(["action_id","operator"])
        r_dict = grouped["url_pattern"].apply(lambda x: x.tolist()).to_dict()
        
        patterns = []
        for i in r_dict.iteritems():
            patterns.append({"operator": i[0][1], "patterns": i[1]})

        # patterns = results.url_pattern.tolist()
        return patterns

    def get_urls(self, advertiser, visits=False):
        query = GET_URLS.format(advertiser)
        df = self.c.select_dataframe(query)

        if not visits:
            df = df[["url"]]
        return df

    def get_action_uids(self, operator, patterns, urls, date=None):
        uid_sets = []

        for pattern in patterns:
            logger.info(pattern)
            filtered = self.filter_urls(urls, pattern)
            uids = self.fetch_uids(filtered, date=date)
            uid_sets.append(uids)

        common = uid_sets[0]
        
        for uid_set in uid_sets:
            if operator == "and":
                logging.info("Using 'AND' operator to combine uids from {}".format(patterns))
                common.intersection_update(uid_set)
            elif operator == "or":
                logging.info("Using 'OR' operator to combine uids from {}".format(patterns))
                common.update(uid_set)
            else:
                raise Exception("Invalid operator: {}".format(operator))
        return common
            

    def get_uids_updated(self, actions, urls, date=None):
        '''This version of get_uids correctly uses operators. Patterns should 
        be in the form of:
        [
            {
                "operator": "and", 
                "patterns":["something.com"]
            }
        ]
        '''
        uid_sets = []
    
        # Get a list of sets
        for action in actions:
            uids = self.get_action_uids(action["operator"], action["patterns"], urls, date=date)
            uid_sets.append(uids)

        # Get the set of uids that have gone through all funnel patterns
        common = uid_sets[0]
        for uid_set in uid_sets:
            common.intersection_update(uid_set) 
        return common

    def fetch_uids(self, urls, chunk_size = 10000, date=None):
        chunks = self.get_chunks(urls, chunk_size)
        queries = []

        for chunk in chunks:
            in_clause = self.format_in_clause(chunk)
            where = "url in ({})".format(in_clause)

            if date:
                where = where + " and timestamp = '{}'".format(date)
            query = GET_UIDS.format(where)
            queries.append(query)
        results = self.batch_execute(queries)

        if not results:
            return []

        uids = set(pd.DataFrame(results).uid.tolist())
        return uids

    def get_domains(self, uids):
        domains = self.fetch_domains(uids)
                
        # Group domains by uid
        grouped = domains.groupby('uid').agg({"domain":lambda x: list(x)}).reset_index()
        grouped["domains"] = grouped.domain
        
        del grouped["domain"]
        del grouped["uid"]
        
        grouped["converted"] = "1"
        
        return grouped

    def fetch_domains(self, uids):
        chunks = self.get_chunks(list(uids), 10000)
        queries = []

        for chunk in chunks:
            in_clause = self.format_in_clause(chunk)
            query = GET_DOMAINS.format(in_clause)
            queries.append(query)
        domains = pd.DataFrame(self.batch_execute(queries))

        return domains

    def filter_df(self, df):
        # Eliminate all bad domains
        df.domains = df.domains.apply(lambda urls: [url for url in urls
                                                    if url not in self.BAD_DOMAINS])
        # Eliminate all users with less than 1 domain
        df = df[df.domains.apply(lambda x: len(x) > 0)]
        
        return df

    def filter_urls(self, all_urls, pattern):
        urls = all_urls[all_urls.url.str.contains(pattern)]
        urls = urls.url.tolist()
        return urls

    def format_in_clause(self, l):
        formatted = ["'{}'".format(item.encode("ascii", "ignore").replace("'", "''")) 
                     for item in l]
        return ','.join(formatted)

    def get_chunks(self, l, n):
        """Yield successive n-sized chunks from l."""
        for i in xrange(0, len(l), n):
            yield l[i:i+n]

    def batch_execute(self, queries):
        futures = []
        results = []

        for query in queries:
            future = self.c.select_async(query)
            result = future.result(timeout=60)
            results.extend(result)
            # futures.append(future)

        # for future in futures:
            # result = future.result(timeout=60)
            # results.extend(result)
        return results
