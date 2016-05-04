QUERY1 = "select pixel_source_name from advertiser where crusher =1"
QUERY2 = "select distinct action_id, action_name,url_pattern from action_with_patterns where pixel_source_name = '{}'"
QUERY5 = "select count(distinct pattern) from uids_only_sessions_cache where advertiser = '{}'"
QUERY6 = "select count(distinct pattern) from uids_only_visits_cache where advertiser = '{}'"
QUERY7 = "select count(distinct url_pattern) from keyword_crusher_cache where advertiser='{}'"

INSERT_QUERY = "insert into crusher_cache_integrity (advertiser, action_table_baseline, table_action_cache, table_full_domain_cache, uids_sessions_cache, uids_visits_cache, results_action_cache, results_full_domain_cache, results_uids_session_cache, results_uids_visits_cache, backfill_action_count, cassandra_recurring_action, result_backfill, result_cassandra) values ('{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})"

REPLACE_QUERY = "replace crusher_cache_integrity (advertiser, action_table_baseline, table_action_cache, table_full_domain_cache, uids_sessions_cache, uids_visits_cache, results_action_cache, results_full_domain_cache, results_uids_session_cache, results_uids_visits_cache, backfill_action_count, cassandra_recurring_action, result_backfill, result_cassandra) values ('{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})"


DOMAINSQUERY = "select count(distinct action_id) from domains_cache where advertiser = '{}'"
DOMAINSQUERY2 = "select count(*) from action_dashboard_cache where advertiser ='{}' and action_id={}"

DOMAINSIDQUERY = "select count(distinct filter_id) from cache_domains_w_filter_id where advertiser = '{}'"
DOMAINSIDQUERY2 = "select count(*) from cache_domains_w_filter_id where advertiser='{}' and filter_id={}"

DOMAINSFULLQUERY = "select count(distinct url_pattern) from domains_full_cache where advertiser = '{}'"
DOMAINSFULLQUERY2 = "select count(*) from domains_full_cache where advertiser = '{}' and url_pattern='{}'"

DOMAINSFULLIDQUERY = "select count(distinct filter_id) from cache_domains_full_w_filter_id where advertiser = '{}'"
DOMAINSFULLIDQUERY2 = "select count(*) from cache_domains_full_w_filter_id where advertiser = '{}' and filter_id={}"

KEYQUERY = "select count(*) from keyword_crusher_cache where advertiser = '{}' and url_pattern='{}'"
SESSIONUIDQUERY = "select count(*) from uids_only_sessions_cache where advertiser='{}' and pattern='{}'"
VISITUIDQUERY = "select count(*) from uids_only_visits_cache where advertiser='{}' and pattern='{}'"
BEFORE_AFTERQUERY = "select count(*) from transform_before_and_after_cache where filter_id={}"
SESSIONSQUERY = "select count(*) from transform_sessions_cache where filter_id={}"
HOURLYQUERY = "select count(*) from transform_hourly_cache where filter_id={}"
MODELQUERY = "select count(*) from transform_model_cache where filter_id={}"

