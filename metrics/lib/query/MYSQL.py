BRAND_QUERY = "select external_id id, external_advertiser_id advertiser_id from creative"

IMPS_QUERY = """
    select 
        v3.campaign_id,
        timestamp(DATE_FORMAT(v3.date, "%%Y-%%m-%%d %%H:00:00")) date,
        sum(v3.imps) as imps,
        sum(v3.clicks) as clicks,
        sum(v3.media_cost* case when v3.cpm_multiplier is null then i.cpm_multiplier else v3.cpm_multiplier end) as media_cost,
        1 as cpm_multiplier,
        0 as is_valid 
    from 
        v3_reporting v3
    left join intraweek i
    on v3.external_advertiser_id=i.external_advertiser_id
    where 
        v3.active=1 and 
        v3.deleted=0 and 
        v3.external_advertiser_id =  %(advertiser_id)s   
    group by 
        1,2
"""

CONVERSION_QUERY = """
    select 
        campaign_id,
        timestamp(DATE_FORMAT(conversion_time, "%%Y-%%m-%%d %%H:00:00")) date,
        0 imps,
        0 as clicks,
        0 as media_cost,
        1 as cpm_multiplier,
        count(*) as is_valid
    from 
        conversion_reporting 
    where 
        active=1 and 
        deleted=0 and 
        external_advertiser_id= %(advertiser_id)s  and 
        is_valid=1 
    group 
        by 1,2
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

CREATIVE_QUERY = """
select 
    creative_id,
    sum(imps) imps,
    sum(clicks) clicks,
    min(u.date) first_served,
    max(u.date) last_served,
    sum(conversions),
    GROUP_CONCAT(DISTINCT campaign_id ORDER BY campaign_id ASC SEPARATOR ' ') associated_campaigns
FROM (
    select 
        creative_id,
        imps,
        clicks,
        0 conversions,
        date,
        campaign_id
    from
        v3_reporting v3
    where 
        v3.active=1 and
        v3.deleted=0 and
        v3.external_advertiser_id = %(advertiser_id)s and
        UNIX_TIMESTAMP(v3.date) >= %(date_min)s and
        UNIX_TIMESTAMP(v3.date) <= %(date_max)s
    UNION ALL (
    select
        creative_id,
        0 imps,
        0 clicks,
        1 conversions,
        conversion_time,
        NULL
    FROM 
        conversion_reporting 
    WHERE 
        active=1 and 
        deleted=0 and 
        external_advertiser_id= %(advertiser_id)s and 
        is_valid=1 and
        UNIX_TIMESTAMP(conversion_reporting.conversion_time) >= %(date_min)s and
        UNIX_TIMESTAMP(conversion_reporting.conversion_time) <= %(date_max)s
    )
) u
group by
    creative_id
"""
