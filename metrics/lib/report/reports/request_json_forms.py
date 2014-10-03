DOMAIN_JSON_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%(start_date)s","end_date":"%(end_date)s","columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"],"name":" Report - 07\/21\/2014","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"]}}'

ADVERTISER_DOMAIN_JSON_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%(start_date)s","end_date":"%(end_date)s","columns":["advertiser","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"],"row_per":["advertiser_id","site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["advertiser","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"],"name":" Report - 07\/22\/2014","ui_columns":["advertiser","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"]}}'

ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%(start_date)s","end_date":"%(end_date)s","columns":["advertiser","campaign","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"],"row_per":["advertiser_id","campaign_id","site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["advertiser","campaign","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"],"name":" Report - 07\/22\/2014","ui_columns":["advertiser","campaign","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost"]}}'

ADVERTISER_DOMAIN_LINE_ITEM_JSON_FORM = """{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%(start_date)s", "end_date":"%(end_date)s","columns":["advertiser","line_item","site_domain","imps","clicks","click_thru_pct", "booked_revenue","post_view_convs","post_click_convs","media_cost"],"row_per":["advertiser_id","line_item_id","site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["advertiser","line_item","site_domain","imps","clicks","click_thru_pct", "booked_revenue","post_view_convs","post_click_convs","media_cost"],"name":" Report - 08\/5\/2014","ui_columns":["advertiser","line_item","site_domain","imps","clicks","click_thru_pct", "booked_revenue","post_view_convs","post_click_convs","media_cost"]}}"""

DATA_PULLING_FORMS = '{ "report": { "report_type":"advertiser_analytics","timezone":"UTC","filters": [ { "seller_type": [ "Real Time" ] } ], "columns":[ "hour", "imps", "clicks","media_cost","advertiser_id","campaign_id","creative_id", "seller_member","line_item_id" ], "row_per":[ "hour","creative_id","campaign_id"], "timezone":"UTC","start_date":"%(start_date)s","end_date":"%(end_date)s", "format":"csv" } }'

CONVERSIONS_FORM="""{"report":{"special_pixel_reporting":false,"report_type":"attributed_conversions","timezone":"UTC","start_date":"%(start_date)s","end_date":"%(end_date)s","filters":[{"pixel_id":["%(pixel_id)s"]}], "columns":[ "advertiser_id", "pixel_id", "pixel_name", "line_item_id", "line_item_name", "campaign_id", "campaign_name", "creative_id", "creative_name", "post_click_or_post_view_conv", "order_id", "user_id", "auction_id", "external_data", "imp_time", "datetime" ], "row_per":["pixel_id","pixel_name","line_item_id","campaign_id","creative_id","post_click_or_post_view_conv","order_id","user_id"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false, "orders":[ "advertiser_id", "pixel_id", "pixel_name", "line_item_id", "line_item_name", "campaign_id", "campaign_name", "creative_id", "creative_name", "post_click_or_post_view_conv", "order_id", "user_id", "auction_id", "external_data", "imp_time", "datetime" ],"name":"LearnVest Report - 07\/25\/2014","ui_columns":["pixel_id","pixel_name","line_item","campaign","creative","post_click_or_post_view_conv","order_id","user_id","auction_id","external_data","imp_time","datetime"],"filter_objects":{"pixels":[{"id":%(pixel_id)s,"name":"LV - Sign Up"}]}}}"""

SEGMENT_FORM = """ { "report": { "start_date":"%(start_date)s","end_date":"%(end_date)s", "report_type": "segment_load", "columns": [ "segment_id", "segment_name", "day", "total_loads", "daily_uniques", "monthly_uniques" ], "groups": [ "segment_id", "day", "month" ], "orders": [ "day" ], "format": "csv" } } """