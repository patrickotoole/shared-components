BRAND_QUERY = "select external_id id, external_advertiser_id advertiser_id from creative"

IMPS_QUERY = """
    select 
        0 is_valid, 
        v3.* 
    from 
        v3_reporting as v3 
    where 
        v3.external_advertiser_id = %(advertiser_id)s 
        and v3.active = 1 
        and v3.deleted = 0
"""

CONVERSION_QUERY = """
    select 
        is_valid, 
        0 id, 
        0 imps, 
        0 clicks, 
        campaign_id, 
        creative_id, 
        0 media_cost, 
        external_advertiser_id, 
        timestamp(DATE_FORMAT(conversion_time, "%%Y-%%m-%%d %%H:00:00")) date, 
        last_activity, 
        deleted, 
        0 cpm_multiplier, 
        active, 
        NULL notes 
    from conversion_reporting as cr 
    where 
        cr.external_advertiser_id = %(advertiser_id)s 
        and cr.active = 1 
        and cr.deleted = 0
"""

UNION_QUERY = "%s UNION ALL (%s)" % (IMPS_QUERY, CONVERSION_QUERY)

BUCKET_QUERY = """
    select 
        campaign_id 
    from campaign_bucket 
    where 
        bucket_name like '%%%(bucket)s%%' 
        and external_advertiser_id = %(advertiser)s
"""


