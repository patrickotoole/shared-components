select group_concat(id), line_item_id, count(*) c from conversion_reporting group by pixel_id, line_item_id, campaign_id, creative_id, order_id, user_id, auction_id, active, deleted having c>1;
delete from conversion_reporting where id in (307, 349, 357, 358, 316, 355, 336, 318, 360, 338, 339, 340, 352, 341, 342, 621, 622, 642, 15952);
alter table conversion_reporting add constraint unique_id unique (`pixel_id`, `line_item_id`, `campaign_id`, `creative_id`, `order_id`, `user_id`, `auction_id`, `active`, `deleted`);

CREATE TABLE `v2_conversion_reporting` (
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
  UNIQUE KEY `unique` (`pixel_id`,`line_item_id`,`campaign_id`,`creative_id`,`order_id`,`user_id`,`auction_id`, `active`, `deleted`)
)
