BRAND_QUERY = "select external_id id, external_advertiser_id advertiser_id from creative"

IMPS_QUERY = """
select 
	v3.campaign_id,
	date_format(date_add(v3.date,interval -4 hour),"%Y-%m-%d %k:00:00") as date,
	sum(v3.imps) as imps,
	sum(v3.clicks) as clicks,
	sum(v3.media_cost*v3.cpm_multiplier) as cost,
	0 as conversions 
from 
	v3_reporting v3
where 
	v3.active=1 and 
	v3.deleted=0 and 
	v3.external_advertiser_id = %(advertiser_id)s  
group by 
	1,2
"""

CONVERSION_QUERY = """
select 
	campaign_id,
	date_format(date_add(conversion_time,interval -4 hour),"%Y-%m-%d %k:00:00") as date,
	0 imps,
	0 as clicks,
	0 as cost,
	count(*) as conversions 
from 
	conversion_reporting 
where 
	active=1 and 
	deleted=0 and 
	external_advertiser_id=306383 and 
	is_valid=1 
group 
	by 1,2;
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


