PARTITIONED_QUERY = "select campaign, seller, referrer, datetime date, imps, clicks, cost, is_valid from campaign_domain_partitioned_new where %s"
PARTITIONED_QUERY_LESS = "select campaign, referrer, datetime date, imps from campaign_domain_partitioned_new where %s" 

AGG_APPROVED_AUCTIONS = """
    select 
        %(groups)s, 
        sum(num_auctions) num_auctions 
    from agg_approved_auctions 
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
    ORDER BY num_users DESC LIMIT 2000
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
ORDER BY num_users DESC LIMIT 2000
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
