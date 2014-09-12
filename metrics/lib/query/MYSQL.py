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
        and external_advertiser_id = %(advertiser_id)s
"""

CAMPAIGN_QUERY = """
    select
        campaign_id
    from advertiser_campaign
    where
        external_advertiser_id = %(advertiser_id)s
"""

CREATIVE_QUERY = """
select 
    u.creative_id,
    sum(u.imps) imps,
    sum(u.clicks) clicks,
    min(u.date) first_served,
    max(u.date) last_served,
    sum(u.conversions) conversions,
    GROUP_CONCAT(DISTINCT u.campaign_id ORDER BY campaign_id ASC SEPARATOR ' ') associated_campaigns,
    c.width,
    c.height
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
join creative c
on c.external_id = u.creative_id
where 
    active=1 and 
    deleted=0
group by
    u.creative_id
"""

CONVERSION_QUERY = """
SELECT 
    date(cr.conversion_time) as 'conversion_time',
    case when cr.pc=1 then 'post_click' else 'post_view' end as 'conversion_type',
    concat(ap.pixel_display_name," Conversion") as 'conversion_event',
    order_id as "converter_data",
    round(time_to_sec(timediff(conversion_time,imp_time))/60/60/24,1) as 'conversion_window_days', 
    round(time_to_sec(timediff(conversion_time,imp_time))/60/60,1) as 'conversion_window_hours' 
FROM conversion_reporting cr 
LEFT JOIN advertiser_pixel ap 
ON cr.pixel_id=ap.pixel_id 
WHERE 
    cr.external_advertiser_id= %(advertiser_id)s and 
    cr.active=1 and 
    cr.deleted=0 and 
    cr.is_valid=1 and 
    ap.deleted=0 
ORDER BY 
    1 asc;
"""

SEGMENTS_LIST = '''
SELECT 
    external_advertiser_id,
    segment_name,
    external_segment_id 
FROM advertiser_segment INNER JOIN advertiser using (external_advertiser_id)
'''


DAILY_DASH = """
SELECT
    *
FROM daily_dash
WHERE 
    %(where)s
"""

INSERT_BATCH_REQUEST = '''
INSERT INTO batch_request 
    (type, content, owner, target_segment, expiration, active, comment) 
VALUES ('{}','{}', '{}', '{}', {}, {}, '{}');
'''

DEACTIVATE_REQUEST = '''
UPDATE batch_request 
SET active=0 
WHERE id={}
'''

ACTIVATE_REQUEST = '''
UPDATE batch_request 
SET active=1 
WHERE id={}
'''

DISTINCT_SEGMENT = '''
SELECT DISTINCT segment 
FROM domain_list
'''

