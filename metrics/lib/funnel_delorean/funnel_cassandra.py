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
        
        uids = self.get_uids(patterns, advertiser_urls)
        
        logger.info("Number of uids: {}".format(len(uids)))
        
        domains = self.get_domains(uids)
        return domains

    def get_funnels(self):
        funnels = self.db.select_dataframe(GET_FUNNELS)
        funnels = funnels[["pixel_source_name", "funnel_name", "funnel_id"]]
        funnels = [tuple(x) for x in funnels.values]
        return funnels

    def get_patterns(self, funnel_name=None, segment_id=None):
        where = "1=1"

        if funnel_name:
            where = where + " and a.funnel_name = '{}'".format(funnel_name)

        if segment_id:
            where = where + " and a.segment_id = {}".format(segment_id)

        query = GET_PATTERNS.format(where)
        patterns = self.db.select_dataframe(query).url_pattern.tolist()
        return patterns

    def get_urls(self, advertiser):
        query = GET_URLS.format(advertiser)
        return self.c.select_dataframe(query)

    def get_uids(self, patterns, urls):
        '''Return uids that have visited at least one url fufilling each pattern in
        patterns.
        '''

        uid_sets = []
    
        # Get a list of sets
        for pattern in patterns:
            logger.info(pattern)
            filtered = self.filter_urls(urls, pattern)
            uids = self.fetch_uids(filtered)
            uid_sets.append(uids)

        # Get the set of uids that have gone through all funnel patterns
        common = uid_sets[0]

        for uid_set in uid_sets:
            common.intersection_update(uid_set)
        return list(common)

    def fetch_uids(self, urls):
        chunks = self.get_chunks(urls, 10000)
        queries = []

        for chunk in chunks:
            in_clause = self.format_in_clause(chunk)
            query = GET_UIDS.format(in_clause)
            queries.append(query)
        uids = set(pd.DataFrame(self.batch_execute(queries)).uid.tolist())
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
        chunks = self.get_chunks(uids, 10000)
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
        formatted = ["'{}'".format(item.encode("ascii", "ignore").replace("'", "''")) for item in l]
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
