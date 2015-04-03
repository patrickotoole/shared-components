DROP PROCEDURE refresh_mv_now;

DELIMITER $$

CREATE PROCEDURE refresh_mv_now (
    OUT rc INT
)
BEGIN

START TRANSACTION;

DELETE FROM reporting.bucket_reporting;

INSERT INTO reporting.bucket_reporting
select 
        bucket_name,
        date,
        campaign_id,
        external_advertiser_id,
        sum(imps) as imps,
        sum(clicks) as clicks,
        sum(media_cost) as media_cost,
        max(cpm_multiplier) as cpm_multiplier,
        sum(is_valid) as is_valid,
        sum(loaded) as loaded,
        sum(visible) as visible,
        sum(visits) as visits
FROM (
select 
    a.bucket_name,
    a.date, 
    a.campaign_id,
    a.external_advertiser_id,
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
        v4.deleted=0
    group by 1,3,4
) a

left join 
    reporting.campaign_bucket_viewability cbv 
on 
    cbv.bucket = a.bucket_name and
    cbv.datetime = a.date and
    cbv.external_advertiser_id = a.external_advertiser_id
 UNION ALL (
    select
        bucket_name,
        date,
        campaign_id,
        external_advertiser_id,
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
                timestamp(DATE_FORMAT(v2.conversion_time, "%Y-%m-%d %H:00:00")) date,
                max(v2.campaign_id) as campaign_id,
                v2.external_advertiser_id,
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
                v2.is_valid=1
            group by 1,3,4 ) b
)
) c
GROUP BY 
  bucket_name,
        date,
        campaign_id,
        external_advertiser_id;

COMMIT;

  SET rc = 0;
END;
$$

DELIMITER ;
