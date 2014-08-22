PARTITIONED_QUERY = "select campaign, seller, referrer, datetime date, imps, clicks, cost, is_valid from campaign_domain_partitioned_new where %s"
PARTITIONED_QUERY_LESS = "select campaign, referrer, datetime date, imps from campaign_domain_partitioned_new where %s" 


