BRAND_QUERY = "select external_id id, external_advertiser_id advertiser_id from creative"

MATERIALIZED_VIEW = "SELECT * from reporting.bucket_reporting where external_advertiser_id = %(advertiser_id)s"
ADMIN_MATERIALIZED_VIEW = "SELECT * from reporting.bucket_reporting_admin where external_advertiser_id = %(advertiser_id)s"


IMPS_QUERY = """
select 
    a.bucket_name,
    a.date, 
    a.campaign_id,
    a.imps,
    a.clicks,
    a.media_cost,
    1 cpm_multiplier,
    0 is_valid,
cbv.loaded,
cbv.visible,
cbv.visits
from (
    select
        v4.date as date,
        max(v4.campaign_id) as campaign_id,
        v4.external_advertiser_id as external_advertiser_id,
        CASE WHEN bucket_name is not null THEN bucket_name ELSE 'default' END as bucket_name,
        sum(v4.imps) as imps,
        sum(v4.clicks) as clicks,
        sum(case when v4.cpm_multiplier is null then 0 else v4.media_cost*v4.cpm_multiplier end) as media_cost
    from
        reporting.v4_reporting v4
    left 
        join campaign_bucket cb
    on 
        v4.campaign_id = cb.campaign_id
    where
        (
            (
                cb.active=1 and
                cb.deleted=0
            ) OR
            cb.active is null
        ) and
        v4.active=1 and
        v4.deleted=0 and
        v4.external_advertiser_id = %(advertiser_id)s
        %(date)s
    group by 1,4
) a

left join 
    reporting.campaign_bucket_viewability cbv 
on 
    cbv.bucket = a.bucket_name and
    cbv.datetime = a.date and
    cbv.external_advertiser_id = a.external_advertiser_id
"""


CONVERSION_QUERY = """
    select
        bucket_name,
        date,
        campaign_id,
        imps,
        clicks,
        media_cost,
        cpm_multiplier,
        is_valid,
        0,
        0,
        0
        from (
            select
                timestamp(DATE_FORMAT(v2.conversion_time, "%%Y-%%m-%%d %%H:00:00")) date,
                max(v2.campaign_id) as campaign_id,
                cb.bucket_name,
                0 imps,
                0 as clicks,
                0 as media_cost,
                1 as cpm_multiplier,
                count(*) as is_valid
            from
                reporting.v2_conversion_reporting v2
            left join campaign_bucket cb
            on v2.campaign_id=cb.campaign_id
            where
                (
                    (
                        cb.active=1 and
                        cb.deleted=0
                    ) OR
                    cb.active is null
                ) and
                v2.active=1 and
                v2.deleted=0 and
                v2.external_advertiser_id=  %(advertiser_id)s   and
                v2.is_valid=1
                %(conv_date)s
            group by 1,3 ) b
"""

UNION_QUERY = "%s UNION ALL (%s)" % (IMPS_QUERY, CONVERSION_QUERY)

IMPS_CONVERSIONS_EXPORT_QUERY = """
    select
        DATE_FORMAT(date_add(date, interval -4 hour), "%%%%Y-%%%%m-%%%%d") as date,
        sum(imps) as imps,
        sum(clicks) as clicks,
        sum(media_cost) as media_cost,
        sum(is_valid) as conversions
    from
        (%s) un
    group by 1

""" % (UNION_QUERY)


BUCKET_QUERY = """
    select
        campaign_id
    from campaign_bucket
    where
        bucket_name like '%%%(bucket)s%%'
        and external_advertiser_id = %(advertiser_id)s
        and active=1 and deleted=0
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
        reporting.v4_reporting v3
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
        reporting.v2_conversion_reporting
    WHERE
        active=1 and
        deleted=0 and
        external_advertiser_id= %(advertiser_id)s and
        is_valid=1 and
        UNIX_TIMESTAMP(reporting.v2_conversion_reporting.conversion_time) >= %(date_min)s and
        UNIX_TIMESTAMP(reporting.v2_conversion_reporting.conversion_time) <= %(date_max)s
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
FROM reporting.v2_conversion_reporting cr
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
    (type, content, owner, target_segment, target_window, expiration, active, comment)
VALUES ('{}','{}', '{}', '{}', {}, {}, {}, '{}');
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
SELECT DISTINCT log
FROM domain_list
'''

DOMAIN_LIST_STATUS = """
SELECT
    %(fields)s
FROM
    domain_list dl
LEFT JOIN
    reporting.domain_list_change_ref ref
ON
    ref.domain = dl.pattern
WHERE
    %(where)s
"""

ADMIN_LOGINS= """
SELECT 
    a.advertiser_name,
    u.username,'admin' as password,
    external_advertiser_id as advertiser_id 
FROM rockerbox.advertiser a LEFT JOIN rockerbox.user u ON a.external_advertiser_id=u.advertiser_id 
WHERE u.username like 'a\_%' and a.deleted=0
"""

HOVERBOARD_V2_CATEGORY = """
SELECT DISTINCT %(fields)s
FROM reporting.hoverboard_category a JOIN rockerbox.category b ON (a.category = b.category_name)
WHERE %(where)s
ORDER BY tf_idf DESC
"""

HOVERBOARD_V2_DOMAIN = """
SELECT %(fields)s
FROM hoverboard_domain
WHERE %(where)s
ORDER BY tf_idf DESC
"""

HOVERBOARD_V2_KEYWORDS = """
SELECT %(fields)s
FROM hoverboard_keywords
WHERE %(where)s
ORDER BY tf_idf DESC
LIMIT %(limit)s
"""

HOVERBOARD_V2_TOPICS = """
SELECT DISTINCT %(fields)s
FROM hoverboard_topic a JOIN hoverboard_topic_terms b ON (a.topic_id = b.topic_id)
WHERE %(where)s
GROUP BY %(groups)s
LIMIT %(limit)s
"""

DOMAIN_CATEGORY = """
SELECT DISTINCT %(fields)s
FROM domain_category a JOIN category b ON (a.category_name = b.category_name)
WHERE %(where)s
GROUP BY %(groups)s
ORDER BY sum(percent_of_users) DESC
LIMIT %(limit)s
"""
ADVERTISER_NAME_TO_ID = """
SELECT external_advertiser_id
FROM rockerbox.advertiser
WHERE 
    pixel_source_name="{}" AND
    deleted=0
"""

ADVERTISER_ID_TO_NAME = """
SELECT pixel_source_name as name
FROM rockerbox.advertiser
WHERE 
    external_advertiser_id=%s AND
    deleted=0
"""

TOP_URLS = """
SELECT %(fields)s
FROM reporting.pixel_url_analytics 
WHERE %(where)s 
GROUP BY %(groups)s 
ORDER BY views DESC
LIMIT %(limit)s
"""

PERMISSIONS_QUERY = """
SELECT DISTINCT
    pixel_source_name,
    external_advertiser_id,
    advertiser_name
FROM user a JOIN user_permissions b on (a.id = b.user_id)
    JOIN permissions_advertiser USING (permissions_id)
    JOIN advertiser USING (external_advertiser_id)
WHERE a.username = '%s'
"""

USER_QUERY = """
SELECT DISTINCT
    user.id as id,
    username,
    advertiser_id as external_advertiser_id,
    password,
    advertiser_name,
    pixel_source_name
FROM user
    JOIN advertiser ON (user.advertiser_id = advertiser.external_advertiser_id)
WHERE username = '%s'"""

ONSITE_STATS = """
SELECT
    advertiser,
    CAST(DATE(date) AS CHAR) AS date,
    engaged/visitors as engagement,
    views/visitors as views_per_user,
    views,
    visitors,
    engaged
FROM reporting.advertiser_daily_stats
WHERE %s
"""
