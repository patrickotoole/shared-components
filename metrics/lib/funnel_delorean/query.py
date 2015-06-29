BAD_DOMAINS = [
    "-",
    "",
    "NA",
    "microsoftadvertisingexchange.com",
    "tpc.googlesyndication.com",
    "collective-exchange.com",
    "ib.adnxs.com",
    "nym1.ib.adnxs.com"
    ]

GET_PATTERNS = """
SELECT a.funnel_id, a.funnel_name, a.segment_id, c.url_pattern, b.order
FROM funnel a
JOIN funnel_actions b
JOIN action_patterns c
on (a.funnel_id = b.funnel_id and b.action_id = c.action_id)
WHERE {} 
"""

GET_FUNNELS = """
SELECT * 
FROM rockerbox.funnel
WHERE model_active=1
"""

GET_URLS = """
SELECT url
FROM rockerbox.visit_urls
WHERE source='{}'
"""

GET_UIDS = """
SELECT uid,url
FROM rockerbox.visit_uids_2
WHERE url IN ({})
"""

GET_POP = """
SELECT
    domains,
    "0" as converted,
    num_imps
FROM pop_uid_domains
HAVING size(domains) > 1 and size(domains) < 2000
"""

GET_DOMAINS = """
SELECT uid, domain
FROM rockerbox.visitor_domains
WHERE uid IN ({})
"""
