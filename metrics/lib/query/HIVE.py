PARTITIONED_QUERY = "select campaign, seller, referrer, datetime date, imps, clicks, cost, is_valid from campaign_domain_partitioned_new where %s"
PARTITIONED_QUERY_LESS = "select campaign, referrer, datetime date, imps from campaign_domain_partitioned_new where %s" 

AGG_APPROVED_AUCTIONS = """
    select 
        %(fields)s
    from agg_approved_auctions_daily
    where %(where)s 
    group by %(groups)s
"""
AGG_ADVERTISER_DOMAIN = """
    select 
        %(fields)s
    from agg_advertiser_domain %(joins)s
    where %(where)s 
    group by %(groups)s
""" 


SEGMENTS_DOMAINS = '''
    SELECT domain,
       sum(num_imps) AS num_imps,
       sum(num_unique_users) AS num_users,
       sum(num_unique_pages) AS num_pages,
       avg(unique_pages_per_user) AS pages_per_user
    FROM agg_domain_imps
    WHERE {}
    GROUP BY domain
    ORDER BY num_users DESC
'''

AGG_POP_DOMAINS = '''
    SELECT
       domain,
       num_imps,
       num_users
    FROM agg_pop_domains 
'''

SEGMENTS_DMAS = '''
SELECT 
    dma,
    sum(num_imps) AS num_imps,
    sum(num_unique_users) AS num_users
FROM agg_domain_imps
WHERE {}
GROUP BY dma
ORDER BY num_users DESC
'''

IMPS_DOMAINS = '''
SELECT 
    domain, 
    date, 
    hour, 
    sum(num_imps) AS num_imps 
FROM agg_domain_imps 
WHERE {} 
GROUP BY date, hour, domain
'''

APPROVED_DOMAINS = '''
SELECT 
    domain, 
    date, 
    hour, 
    sum(num_auctions) AS num_auctions 
FROM agg_approved_auctions 
WHERE {} 
GROUP BY date,hour,domain
'''

APPROVED_TYPE_SELLER = '''
SELECT 
    type,
    date,
    hour,
    seller, 
    sum(num_auctions) as num_auctions
FROM agg_approved_auctions 
WHERE {} 
GROUP BY {}
'''

ADVERTISER_VIEWABLE = """
select 
    %(fields)s
FROM advertiser_visibility_daily
%(joins)s
where %(where)s 
group by %(groups)s 
"""

CONVERSION_QUERY = """
SELECT %(fields)s
FROM conv_attribution
%(joins)s
WHERE 
    %(where)s
GROUP BY %(groups)s
"""

CENSUS_CONVERSION_QUERY = """
SELECT %(fields)s
FROM (SELECT date, advertiser, zip_code, count(*) as num_conv FROM conv_attribution WHERE %(where)s and zip_code IS NOT NULL GROUP BY date, advertiser, zip_code)
%(joins)s
WHERE 
    %(where)s
GROUP BY %(groups)s
"""

CONVERSION_IMPS_QUERY = """
SELECT %(fields)s
FROM served_conv
WHERE 
    auction_id IS NOT NULL AND
    %(where)s
GROUP BY %(groups)s
"""

DEBUG_QUERY = """
SELECT %(fields)s
FROM debug_data
WHERE 
    %(where)s
GROUP BY %(groups)s
"""

DOMAIN_CATEGORIES = """
SELECT %(fields)s
FROM domain_categories
WHERE %(where)s
GROUP BY %(groups)s
"""

PIXEL= '''
SELECT %(fields)s
FROM agg_pixel
WHERE %(where)s
GROUP BY %(groups)s
'''

PIXEL_GEO= '''
SELECT %(fields)s
FROM pixel_geo_analytics
WHERE %(where)s
GROUP BY %(groups)s
'''

CENSUS_PIXEL_GEO= '''
SELECT %(fields)s
FROM (
     SELECT
            advertiser,
            date,
            zip_code,
            sum(num_views) as num_views
     FROM pixel_geo_analytics
     WHERE %(where)s and zip_code is not null
     GROUP BY advertiser, date, zip_code
) %(joins)s
WHERE %(where)s
GROUP BY %(groups)s
'''

PIXEL_DEVICE= '''
SELECT %(fields)s
FROM pixel_agent_analytics
WHERE %(where)s
GROUP BY %(groups)s
'''
DOMAIN_AVAILS = """
SELECT %(fields)s
FROM agg_domain_avails %(joins)s
WHERE %(where)s
GROUP BY %(groups)s
"""

CLICK_QUERY = """
SELECT %(fields)s
FROM click_attribution
%(joins)s
WHERE 
    %(where)s
GROUP BY %(groups)s
"""

CLICK_IMPS_QUERY = """
SELECT %(fields)s
FROM served_clicked
WHERE 
    auction_id IS NOT NULL AND
    %(where)s
GROUP BY %(groups)s
"""

CENSUS_AGE_GENDER_QUERY = """
SELECT %(fields)s
FROM census_age_gender a %(joins)s
WHERE
    %(where)s AND number > 0 AND percent > 0.0
GROUP BY %(groups)s
HAVING %(having)s
"""

CENSUS_INCOME_QUERY = """
SELECT %(fields)s
FROM zip_code_ref
WHERE
    %(where)s AND median_household_income is NOT NULL AND population IS NOT NULL
GROUP BY %(groups)s
"""

CENSUS_RACE_QUERY = """
SELECT %(fields)s
FROM census_race a %(joins)s
WHERE
    %(where)s AND number > 0 AND percent > 0.0
GROUP BY %(groups)s
HAVING %(having)s
"""

SERVED_GEO = """
SELECT %(fields)s
FROM served_geo_analytics
WHERE
    %(where)s 
GROUP BY %(groups)s
"""

CENSUS_SERVED_GEO = """
SELECT %(fields)s
FROM (
     SELECT
            advertiser,
            date,
            zip_code,
            sum(num_served) as num_served
     FROM served_geo_analytics
     WHERE %(where)s and zip_code is not null
     GROUP BY advertiser, date, zip_code
) %(joins)s
WHERE
    %(where)s 
GROUP BY %(groups)s
"""

HOVERBOARD = """
SELECT %(fields)s
FROM agg_conv_imps_new %(joins)s
WHERE %(where)s
GROUP BY %(groups)s
HAVING %(having)s
"""

HOVERBOARD_KEYWORDS = """
SELECT %(fields)s
FROM (
        SELECT
            source as advertiser,
            bid_request.bid_info.user_id_64 as uid,
            combine_unique(url_terms(lower(reflect('java.net.URLDecoder', 'decode',bid_request.bid_info.url)))) as terms
        FROM conv_imps
        WHERE %(where)s
        GROUP BY source, bid_request.bid_info.user_id_64
) a
GROUP BY %(groups)s
HAVING %(having)s
"""

VISITS = """
SELECT %(fields)s
FROM served_visits
WHERE %(where)s
GROUP BY %(groups)s
HAVING %(having)s
"""

CAMPAIGN_DAILY = """
SELECT %(fields)s
FROM campaign_hourly a 
JOIN (SELECT DISTINCT campaign_id, campaign_name FROM campaign_ref) b ON (a.campaign = b.campaign_id)
WHERE %(where)s and advertiser!= "__HIVE_DEFAULT_PARTITION__"
GROUP BY %(groups)s
HAVING %(having)s
"""

