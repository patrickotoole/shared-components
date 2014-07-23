DATE_INFO = "select STR_TO_DATE('%s', '%s')"
PIXEL_INFO = "select pixel_display_name, pixel_id from advertiser_pixel where deleted = 0"
RECENT_SPEND = """
    select 
        date(date) as wk_no,
        external_advertiser_id,
        sum(media_cost) as Media_Cost
    from v3_reporting 
    where 
        date(date_add(date,interval -4 hour)) = subdate(current_date,1) 
        and deleted = 0 and active = 1 
    group by 1,2 order by 1 asc;
"""

BUDGET = "select external_advertiser_id, budget, id from insertion_order where deleted = 0"
ADVERTISER_NAME = "select external_advertiser_id, advertiser_name from advertiser where deleted = 0"
IO_DATES = """
    select id, external_advertiser_id,actual_start_date, end_date_proposed, 
        timestampdiff(DAY,actual_start_date,NOW()) as days_into_campaign, 
        timestampdiff(DAY,start_date_proposed, 
        end_date_proposed) as proposed_campaign_length 
    from insertion_order 
    where 
        actual_start_date is not NULL 
        and actual_end_date is NULL 
        and deleted = 0
"""

CONVERSIONS = """
    select 
        STR_TO_DATE(CONCAT(yearweek(date_add(conversion_time,interval -4 hour)),'Sunday'), '%X%V%W') as wk_no,pixel_id,
        external_advertiser_id, sum(case when is_valid=1 then 1 else 0 end) as num_conversions 
    from conversion_reporting 
    where 
        active=1 and deleted=0 
        and is_valid=1 
    group by 1,2,3 order by 1 asc
"""
CHARGES = """
    select 
        STR_TO_DATE(CONCAT(yearweek(date_add(date,interval -4 hour)),'Sunday'), '%X%V%W') as wk_no,
        external_advertiser_id,sum(imps) as Impressions,
        sum(clicks) as Clicks,
        sum(media_cost) as Media_Cost,
        sum(media_cost*cpm_multiplier) as Charged_Client,
        cpm_multiplier 
    from v3_reporting 
    where 
        active=1 and deleted=0 
    group by 1,2 order by 1 asc;
"""
CPA_TARGET = """select target_cpa 
    from intraweek 
    where 
        external_advertiser_id = (%d) 
        and deleted = 0
"""
UPDATE_CPA_TARGET = """
    insert into intraweek 
        (external_advertiser_id, cpm_multiplier, target_cpa, deleted) 
        values (%d, %f, %f, 0) 
    on duplicate key update 
        cpm_multiplier = %f, 
        target_cpa = %f
"""


