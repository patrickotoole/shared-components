from link import lnk
import datetime

db = lnk.dbs.rockerbox
QUERY1 = "select pixel_source_name from advertiser where crusher =1"
QUERY2 = "select distinct action_id, action_name from action where pixel_source_name = '{}'"
QUERY3 = "select count(distinct action_id) from action_dashboard_cache where advertiser = '{}'"
QUERY4 = "select count(distinct url_pattern) from full_domain_cache_test where advertiser = '{}'"
QUERY5 = "select count(distinct pattern) from uids_only_sessions_cache where advertiser = '{}'"
QUERY6 = "select count(distinct pattern) from uids_only_visits_cache where advertiser = '{}'"

INSERT_QUERY = "insert into crusher_cache_integrity (advertiser, action_table_baseline, table_action_cache, table_full_domain_cache, uids_sessions_cache, uids_visits_cache, results_action_cache, results_full_domain_cache, results_uids_session_cache, results_uids_visits_cache, backfill_action_count, cassandra_recurring_action, result_backfill, result_cassandra) values ('{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})"
REPLACE_QUERY = "replace crusher_cache_integrity (advertiser, action_table_baseline, table_action_cache, table_full_domain_cache, uids_sessions_cache, uids_visits_cache, results_action_cache, results_full_domain_cache, results_uids_session_cache, results_uids_visits_cache, backfill_action_count, cassandra_recurring_action, result_backfill, result_cassandra) values ('{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})"

data = db.select_dataframe(QUERY1)

for advertiser in data.iterrows():
    current_baseline = db.select_dataframe(QUERY2.format(advertiser[1]["pixel_source_name"]))
    base_size = len(current_baseline)

    current_action_cache = db.select_dataframe(QUERY3.format(advertiser[1]["pixel_source_name"]))
    current_ac =current_action_cache["count(distinct action_id)"][0]

    current_full_domain_cache = db.select_dataframe(QUERY4.format(advertiser[1]["pixel_source_name"]))
    current_fdc = current_full_domain_cache["count(distinct url_pattern)"][0]

    current_uids_sessions_cache = db.select_dataframe(QUERY5.format(advertiser[1]["pixel_source_name"]))
    current_usc = current_uids_sessions_cache["count(distinct pattern)"][0]

    current_uids_visits_cache = db.select_dataframe(QUERY6.format(advertiser[1]["pixel_source_name"]))
    current_uvc = current_uids_visits_cache["count(distinct pattern)"][0]

    result1 = 1 if current_ac == base_size else 0
    result2 = 1 if current_fdc == base_size else 0
    result3 = 1 if current_usc == base_size else 0
    result4 = 1 if current_uvc == base_size else 0

    ACTIONS_QUERY = "select url_pattern from action_with_patterns where pixel_source_name = '{}'"
    actions = db.select_dataframe(ACTIONS_QUERY.format(advertiser[1]["pixel_source_name"]))
   
    backfill_actions = []
    cassandra_actions = []
    for action in actions.iterrows():
        query_count = "select count(distinct cache_date) from pattern_cache where pixel_source_name='{}' and url_pattern='{}'"
        check_backfill_ran = db.select_dataframe(query_count.format(advertiser[1]["pixel_source_name"], action[1]["url_pattern"]))

        if check_backfill_ran["count(distinct cache_date)"][0]> 0: 
            back_ran = 1
            
            query_date = "select max(timestamp) from pattern_cache where pixel_source_name = '{}' and url_pattern = '{}'"
            num_days_since_backfill = db.select_dataframe(query_date.format(advertiser[1]["pixel_source_name"], action[1]["url_pattern"]))
            timestamp_backfill = num_days_since_backfill["max(timestamp)"][0]

            num_days = max(timestamp_backfill, datetime.datetime.now() - datetime.timedelta(days=30))
            CASSANDRA_RECURRING_QUERY = "select count(distinct cache_date) from pattern_unique_cache where pixel_source_name = '{}' and cache_date > '{}' and url_pattern = '{}'"
            recurring =db.select_dataframe(CASSANDRA_RECURRING_QUERY.format(advertiser[1]["pixel_source_name"],num_days, action))
            
            num_days_since_backfill = datetime.datetime.now() - num_days
            if num_days_since_backfill.days == recurring["count(distinct cache_date)"][0]:
                if advertiser[1]["pixel_source_name"] == "fsastore":
                    print "segment done" 
                    print action
                cassandra_cache = 1
            else:
                if advertiser[1]["pixel_source_name"] == "fsastore":
                    print action
                cassandra_cache = 0
        else:
            back_ran = 0
            cassandra_cache = 0

        backfill_actions.append(back_ran)
        cassandra_actions.append(cassandra_cache)
    
    result5 = 1 if sum(backfill_actions) == base_size else 0
    result6 = 1 if sum(cassandra_actions) == base_size else 0

    try:
        db.execute(INSERT_QUERY.format(advertiser[1]["pixel_source_name"], base_size, current_ac, current_fdc, current_usc, current_uvc, result1, result2, result3, result4, sum(backfill_actions), sum(cassandra_actions),result5, result6))
    except:
        db.execute(REPLACE_QUERY.format(advertiser[1]["pixel_source_name"], base_size, current_ac, current_fdc, current_usc, current_uvc, result1, result2, result3, result4, sum(backfill_actions), sum(cassandra_actions), result5, result6))
