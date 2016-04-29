from link import lnk
import datetime, pandas
from health_check_query import *

INSERT_SQL = "insert into crusher_cache_integrity (advertiser, action_table_baseline, table_action_cache, table_full_domain_cache, uids_sessions_cache, uids_visits_cache, keyword_cache, backfill_action_count, cassandra_recurring_action, before_and_after_count, hourly_count, sessions_count, model_count) values ('{}', {}, {},{},{},{},{},{},{},{},{},{},{})"

REPLACE_SQL = "REPLACE into crusher_cache_integrity (advertiser, action_table_baseline, table_action_cache, table_full_domain_cache, uids_sessions_cache, uids_visits_cache, keyword_cache, backfill_action_count, cassandra_recurring_action, before_and_after_count, hourly_count, sessions_count, model_count) values ('{}', {}, {},{},{},{},{},{},{},{},{},{},{})"

class HealthChecks():

    def __init__(self, advertiser,db, crushercache, crusherapi):
        self.advertiser = advertiser
        self.actions_dict = {}
        self.size_dict = {}
        self.db =db
        self.crushercache = crushercache
        self.crusher_api = crusherapi
        self.url_pattern_dict = {}
    
    def selectActions(self):
        current_baseline = self.db.select_dataframe(QUERY2.format(self.advertiser))
        self.size_dict['baseline'] = len(current_baseline)
        for action_segment in current_baseline.iterrows():
            self.actions_dict[action_segment[1]['action_id']] = {}
            self.url_pattern_dict[action_segment[1]['action_id']] = action_segment[1]['url_pattern']

    def checkDomains(self):
        current_action_cache = self.crushercache.select_dataframe(DOMAINSQUERY.format(self.advertiser))
        current_ac =current_action_cache["count(distinct action_id)"][0]
        self.size_dict['domains'] = current_ac

        current_with_ids = self.crushercache.select_dataframe(DOMAINSIDQUERY.format(self.advertiser))
        current_ids =current_with_ids["count(distinct filter_id)"][0]
        self.size_dict['domains_w_filter_id'] = current_ids
        
        for acts in self.actions_dict.keys(): 
            adc_action_id = self.crushercache.select_dataframe(DOMAINSQUERY2.format(self.advertiser, acts))
            val = 1 if adc_action_id['count(*)'][0] >0 else 0
            self.actions_dict[acts]["domains"] = val

            dwf_action_id = self.crushercache.select_dataframe(DOMAINSIDQUERY2.format(self.advertiser, acts))
            self.actions_dict[acts]["domains_w_id"] = dwf_action_id['count(*)'][0]
   
 
    def checkDomainsFull(self):
        current_full = self.crushercache.select_dataframe(DOMAINSFULLQUERY.format(self.advertiser))
        self.size_dict['domains_full'] = current_full["count(distinct url_pattern)"][0]

        current_full_ids = self.crushercache.select_dataframe(DOMAINSFULLIDQUERY.format(self.advertiser))
        self.size_dict['domains_full_w_filter_id'] = current_full_ids["count(distinct filter_id)"][0]

        for acts in self.actions_dict.keys():
            domains_full_new = self.crushercache.select_dataframe(DOMAINSFULLQUERY2.format(self.advertiser, acts))
            self.actions_dict[acts]['domains_full'] = domains_full_new['count(*)'][0]


    def checkKeywords(self):
	current_keyword = self.crushercache.select_dataframe(QUERY7.format(self.advertiser))
	self.size_dict['keywords'] = len(current_keyword)
        for acts in self.actions_dict.keys():
            current_keyword = self.crushercache.select_dataframe(KEYQUERY.format(self.advertiser, self.url_pattern_dict[acts]))
            self.actions_dict[acts]['keywords'] = current_keyword['count(*)'][0]

    def checkUIDS(self):
	
        current_uids_sessions_cache = self.crushercache.select_dataframe(QUERY5.format(self.advertiser))
	current_usc = current_uids_sessions_cache["count(distinct pattern)"][0]
        self.size_dict['sessions_uid'] = current_usc

        current_uids_visits_cache = self.crushercache.select_dataframe(QUERY6.format(self.advertiser))
        current_uvc = current_uids_visits_cache["count(distinct pattern)"][0]
        self.size_dict['visits_uid'] = current_uvc

        for acts in self.actions_dict.keys():
            session_uid = self.crushercache.select_dataframe(SESSIONUIDQUERY.format(self.advertiser, self.url_pattern_dict[acts]))
            self.actions_dict[acts]['sessions_uid'] = session_uid['count(*)'][0]
            
            visit_uid = self.crushercache.select_dataframe(VISITUIDQUERY.format(self.advertiser, self.url_pattern_dict[acts]))
            self.actions_dict[acts]['visits_uid'] = visit_uid['count(*)'][0]


    def checkModules(self):
        for acts in self.actions_dict.keys():
            module_before_and_after = self.crushercache.select_dataframe(BEFORE_AFTERQUERY.format(acts))
            self.actions_dict[acts]['before_after'] = module_before_and_after['count(*)'][0]

            module_sessions = self.crushercache.select_dataframe(SESSIONSQUERY.format(acts))
            self.actions_dict[acts]['sessions'] = module_sessions['count(*)'][0]

            module_hourly = self.crushercache.select_dataframe(HOURLYQUERY.format(acts))
            self.actions_dict[acts]['hourly'] = module_hourly['count(*)'][0]

            module_model = self.crushercache.select_dataframe(MODELQUERY.format(acts))
            self.actions_dict[acts]['model'] = module_model['count(*)'][0]

   
    def checkEmpty(self):
        df = pandas.DataFrame(self.actions_dict)

        total_count = df.T.apply(lambda x : x.sum())
        count_dict = {}

        for ind in total_count.index:
            count_dict[ind] = len(self.actions_dict.keys()) - total_count[ind]
        
        try:
            self.crushercache.execute(INSERT_SQL.format(self.advertiser, len(self.actions_dict.keys()), count_dict['domains'], count_dict['domains_full'], count_dict['sessions_uid'], count_dict['visits_uid'], count_dict['keywords'], count_dict['backfill'], count_dict['recurring'], count_dict['before_after'], count_dict['hourly'], count_dict['sessions'], count_dict['model']))
        except:
            self.crushercache.execute(REPLACE_SQL.format(self.advertiser, len(self.actions_dict.keys()), count_dict['domains'], count_dict['domains_full'], count_dict['sessions_uid'], count_dict['visits_uid'], count_dict['keywords'], count_dict['backfill'], count_dict['recurring'], count_dict['before_after'], count_dict['hourly'], count_dict['sessions'], count_dict['model']))


    def checkCassandraEndpoint(self):
        url = '/crusher/pattern_search/timeseries_only?search={}'
        for act in self.actions_dict.keys():
            resp = self.crusher_api.get(url.format(self.url_pattern_dict[act]))
            completedUV = True
            completedViews = True
            for data in resp.json['results']:
                if data['views'] == 0:
                    completedViews = False
                if data['uniques'] == 0 or data['visits'] == 0:
                    completedUV = False

            if completedViews:
                self.actions_dict[act]['backfill'] = 1
            else:
                self.actions_dict[act]['backfill'] = 0
            if completedUV:
                self.actions_dict[act]['recurring'] = 1
            else:
                self.actions_dict[act]['recurring'] = 0
 


if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",default="fsastore")

    basicConfig(options={})

    parse_command_line()

    db = lnk.dbs.rockerbox
    crusher = lnk.dbs.crushercache
    crusherapi = lnk.api.crusher
    crusherapi.base_url='http://192.168.99.100:8888'
    crusherapi.user='a_{}'.format(options.advertiser)
    crusherapi.password='admin'
    crusherapi.authenticate()

    HC = HealthChecks(options.advertiser, db, crusher, crusherapi)
    HC.selectActions()
    HC.checkDomains()
    HC.checkDomainsFull()
    HC.checkKeywords()
    HC.checkUIDS()
    HC.checkCassandraEndpoint()
    HC.checkModules()
    HC.checkEmpty()
    #HC.printMissing()
