import tornado.web
import tornado.gen
import pandas
import logging
import time

import itertools

from twisted.internet import defer
from lib.helpers import decorators
from lib.helpers import *

from lib.cassandra_helpers.helpers import FutureHelpers
from lib.cassandra_cache.helpers import *

import model
from ...visit_domains import VisitDomainBase
from ..search_base import SearchBase
from ..cache.pattern_search_cache import PatternSearchCache

from helpers import PatternSearchHelpers, group_sum_sort_np_array, check_required_days
from stats import PatternStatsBase
from response import PatternSearchResponse
from sample import PatternSearchSample

from temporal import *


class PatternSearchBase(VisitDomainBase, PatternSearchSample, PatternStatsBase, PatternSearchResponse):


    @defer.inlineCallbacks
    def get_uid_domains(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60, numdays=5):
        PARAMS = "uid"
        indices = [PARAMS]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        terms, remaining_terms = self.head_and_tail(pattern_terms)
        df = yield self.defer_execute(PARAMS, advertiser, terms, date_clause, "must", False, numdays=2)


        if len(df) > 0:
            uids = list(set(df.uid.values))
            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        defs = [self.defer_get_uid_domains(advertiser,pattern_terms[0][0],uids[:10000],date_clause)]


        dl = defer.DeferredList(defs)
        dom = yield dl

        _domains = dom[0][1]

        if len(_domains) > 100:
            prepped = _domains.unstack(1).fillna(0)
            try:
                response['clusters'] = model.cluster(_domains, prepped)
                # response['clusters'] = []
            except:
                pass
        
        self.write_json(response)




    @defer.inlineCallbacks
    def get_users_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        df, stats_df, url_stats_df = yield self.sample_stats_onsite(*sample_args)

        uids = list(set(df.uid.values))[:5000]
        defer.returnValue([uids])

    @defer.inlineCallbacks
    def get_uids(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.set_header("Access-Control-Allow-Origin","null")
        self.set_header("Access-Control-Allow-Credentials","true")
        PARAMS = "uid"
        indices = [PARAMS]
        term = pattern_terms[0][0]

        response = self.default_response(pattern_terms,logic)
        response['summary']['num_users'] = 0

        num_days = 2
        
        uids = yield self.get_users_sampled(advertiser,term,build_datelist(num_days),num_days) 

        uids = uids[0]
        dom = yield self.sample_offsite_domains(advertiser, term, uids, num_days) 
        domains = dom[0][1]
       
        urls, raw_urls = yield self.defer_get_uid_visits(advertiser,uids,term)

        joined = url_domain_intersection(urls,domains)
        before, after = before_and_after(joined)


        # before
        before_grouped = groupby_timedifference(before)
        idf = get_idf(self.db,set(before_grouped.domain))

        merged = before_grouped.merge(idf,on="domain")
        before_domains = time_bucket_domains(merged)
        before_categories = category_time_buckets(merged).to_dict()

        before_categories = [{"key":k,"values":v} for k,v in before_categories.items()]


        # after
        after_grouped = groupby_timedifference(after)
        idf = get_idf(self.db,set(after_grouped.domain))

        merged = after_grouped.merge(idf,on="domain")
        after_domains = time_bucket_domains(merged)
        after_categories = category_time_buckets(merged).to_dict()

        after_categories = [{"key":k,"values":v} for k,v in after_categories.items()]


        # hourly
        domains_with_cat = domains.merge(idf,on="domain")
        domains_with_cat['hour'] = domains_with_cat.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])

        category_visits_uniques = domains_with_cat.groupby(["parent_category_name","hour"])['uid'].agg({"visits":lambda x: len(x), "uniques": lambda x: len(set(x)) })
        category_hourly = category_visits_uniques.reset_index()

        raw_urls['hour'] = raw_urls.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])
        
        visits_hourly = raw_urls.groupby("hour")['uid'].agg({"visits":lambda x: len(x), "uniques": lambda x : len(set(x))}).reset_index()

        _df = self.db.select_dataframe("SELECT * from action_with_patterns where pixel_source_name = '%s'" % self.current_advertiser_name)

        _xx = {}
        for url in set(raw_urls.url):
            _xx[url] = list(_df.url_pattern[_df.url_pattern.map(lambda x: x in url)])

        url_to_action = pandas.DataFrame(pandas.Series(_xx),columns=["actions"])
        url_to_action.index.name = "url"


        # sessions
        users = raw_urls
        users['ts'] = users.timestamp.map(pandas.to_datetime)
        summary = users.groupby(["uid","date","hour"]).ts.describe().unstack(3)

        def session_per_day(x): 

            date = x.date.iloc[0].split(" ")[0]
            x = x[[i for i in x.columns if i not in ["uid","date"]]].iloc[0]

            session_start = []
            session_end = []
            session_visits = []

            i = 0
            for value in "|".join(map(str,x)).split("nan"):
                if len(value.replace("|","")) > 0:

                    session_start += [i]
                    i += len(value[1:-1].split("|")) 

                    session_end += [i-1]

                    start = 1 if value[0] == "|" else None
                    end = -1 if value[-1] == "|" else None

                    values = map(int,value[start:end].split("|"))
                    session_visits += [sum(values)]
                i += 1

            results = []
            for i,start in enumerate(session_start):
                end = session_end[i]
                results += [{
                    "session_start": date + " " + str(start) + ":00:00",
                    "session_end": date + " " + str(end) + ":00:00",
                    "start_hour": start,
                    "session_length": int(end) - int(start),
                    "visits": session_visits[i]
                }]


            df = pandas.DataFrame(results)

            return df

        
        vv = summary['count'].unstack("hour").reset_index()
        cols = ["session_start","session_end","session_length","start_hour","visits"]
        sessions = vv.groupby(["uid","date"]).apply(session_per_day).reset_index().set_index("uid")[cols]

        hours = [str(i) if len(str(i)) > 1 else "0" + str(i) for i in range(0,24)]
        

        def uid_summary(x):
            bucket_sessions = sessions.ix[list(set(x))]
            urls = raw_urls[raw_urls.uid.isin(list(set(x)))]
            merged = urls.merge(url_to_action.reset_index(),on="url",how="left")

            actions_by_hour = merged.groupby("hour")['actions'].apply(lambda x: pandas.DataFrame(pandas.Series([j for i in x for j in i ]),columns=["action"]).groupby("action")['action'].count() ).unstack("hour")
            actions_by_hour = actions_by_hour.T.ix[hours].fillna(0).T


            start_hours    = bucket_sessions.groupby("start_hour")['visits'].agg({"sessions":len,"visits":sum})
            session_length = bucket_sessions.groupby("session_length")['visits'].agg({"sessions":len,"visits":sum})
            session_visits = bucket_sessions.groupby("visits")['visits'].agg({"sessions":len,"total_visits":sum})


            return [{
                "session_starts": start_hours.reset_index().T.to_dict().values(),
                "session_length": session_length.reset_index().T.to_dict().values(),
                "session_visits": session_visits.reset_index().T.to_dict().values(),
                "actions": [{"key":i,"values":j} for i,j in actions_by_hour.T.reset_index().to_dict().items()]
            }]
            

        xx = domains_with_cat.groupby(["parent_category_name","hour"])['uid'].agg({
            "visits":lambda x: len(x), 
            "uniques": lambda x: len(set(x)), 
            "on_site": uid_summary
        })

        xx['on_site'] = xx['on_site'].map(lambda x: x[0])

        url_ts, domain_ts = url_domain_intersection_ts(urls,domains)


        if len(uids) > 0:
            response['before_categories'] = before_categories
            response['before_domains'] = before_domains.T.to_dict()

            response['after_categories'] = after_categories
            response['after_domains'] = after_domains.T.to_dict()

            response['hourly_visits'] = visits_hourly.T.to_dict().values()
            response['hourly_domains'] = xx.reset_index().T.to_dict().values()



            response['results'] = uids
            response['domains'] = domain_ts.T.to_dict()
            response['actions_events'] = url_ts.T.to_dict()


            response['summary']['num_users'] = len(response['results'])
        
        self.write_json(response)




    @defer.inlineCallbacks
    def get_generic_cached(self,advertiser,term,dates,num_days):
        args = [advertiser,term,dates]

        stats_df, domain_stats_df, url_stats_df = yield self.get_all_stats(*args)
        check_required_days(stats_df,num_days)

        defer.returnValue([stats_df, domain_stats_df, url_stats_df])

    @defer.inlineCallbacks
    def get_generic_sampled(self,advertiser,term,dates,num_days):
        sample_args = [term,"",advertiser,dates,num_days]

        df, stats_df, url_stats_df = yield self.sample_stats_onsite(*sample_args)

        uids = list(set(df.uid.values))[:1000]
        domain_stats_df = yield self.sample_stats_offsite(advertiser, term, uids, num_days) 

        defer.returnValue([stats_df, domain_stats_df, url_stats_df])
            
    @defer.inlineCallbacks
    def get_generic(self, advertiser, pattern_terms, num_days, logic="or",timeout=60,timeseries=False):

        dates = build_datelist(num_days)
        args = [advertiser,pattern_terms[0][0],dates,num_days]

        try: 
            stats_df, domain_stats_df, url_stats_df = yield self.get_generic_cached(*args)
        except: 
            stats_df, domain_stats_df, url_stats_df = yield self.get_generic_sampled(*args)

        stats = stats_df.join(domain_stats_df).join(url_stats_df).fillna(0)
        urls, domains = yield self.deferred_reformat_stats(domain_stats_df,url_stats_df)

        response = self.default_response(pattern_terms,logic,no_results=True)

        response = self.response_urls(response,urls)
        response = self.response_domains(response,domains)
        response = self.response_summary(response,stats)
        response = self.response_timeseries(response,stats) if timeseries else response

        self.write_json(response)

    def get_count(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout)

    def get_timeseries(self, advertiser, pattern_terms, date_clause, logic="or",timeout=60):
        self.get_generic(advertiser, pattern_terms, date_clause, logic, timeout, True)


    # THE FOLLOWING SHOULD BE ITS OWN ENDPOINT...



