CREATE TABLE `conversion_reporting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `external_advertiser_id` int(10) DEFAULT NULL,
  `pixel_id` int(10) NOT NULL,
  `pixel_name` varchar(250) DEFAULT NULL,
  `line_item_id` int(10) NOT NULL,
  `line_item_name` varchar(250) DEFAULT NULL,
  `campaign_id` int(10) DEFAULT NULL,
  `campaign_name` varchar(500) DEFAULT NULL,
  `creative_id` int(10) DEFAULT NULL,
  `creative_name` varchar(250) DEFAULT NULL,
  `pc` tinyint(1) DEFAULT NULL,
  `order_id` varchar(100) DEFAULT NULL,
  `user_id` varchar(40) DEFAULT NULL,
  `auction_id` varchar(40) DEFAULT NULL,
  `imp_time` datetime DEFAULT NULL,
  `conversion_time` datetime DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  `active` tinyint(4) DEFAULT '1',
  `new_user` tinyint(1) DEFAULT '1',
  `is_valid` tinyint(1) DEFAULT '1',
  `notes` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique` (`pixel_id`,`line_item_id`,`campaign_id`,`creative_id`,`order_id`,`user_id`,`auction_id`)
)

CREATE TABLE `domain_reporting` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `domain` varchar(100) DEFAULT NULL,
  `advertiser` int(11) DEFAULT NULL,
  `campaign_id` int(11) DEFAULT NULL,
  `line_item` int(11) DEFAULT NULL,
  `imps` int(11) DEFAULT NULL,
  `clicks` int(11) DEFAULT NULL,
  `ctr` float(7,2) DEFAULT NULL,
  `convs` int(11) DEFAULT NULL,
  `pv_convs` int(11) DEFAULT NULL,
  `pc_convs` int(11) DEFAULT NULL,
  `rev` float(7,2) DEFAULT NULL,
  `mc` float(7,2) DEFAULT NULL,
  `profit` float(7,2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique` (`advertiser`,`domain`,`line_item`,`imps`,`clicks`,`ctr`,`convs`,`pv_convs`,`pc_convs`,`rev`,`mc`,`profit`)
)

CREATE TABLE `segment_reporting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `segment_id` int(10) NOT NULL,
  `segment_name` varchar(100) DEFAULT NULL,
  `date_time` datetime DEFAULT NULL,
  `total_loads` int(10) NOT NULL,
  `monthly_uniques` int(10) NOT NULL,
  `daily_uniques` int(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique` (`segment_id`,`segment_name`,`date_time`,`total_loads`,`monthly_uniques`, `daily_uniques`)
)

CREATE TABLE `stats_event_report` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `job_created_at` datetime DEFAULT NULL,
  `job_ended_at` datetime DEFAULT NULL,
  `event_name` varchar(250) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
)
