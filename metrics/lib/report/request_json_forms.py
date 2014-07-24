DOMAIN_JSON_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%s","end_date":"%s","columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/21\/2014","ui_columns":["site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

ADVERTISER_DOMAIN_JSON_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%s","end_date":"%s","columns":["advertiser","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["advertiser_id","site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["advertiser","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/22\/2014","ui_columns":["advertiser","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM = '{"report":{"special_pixel_reporting":false,"report_type":"network_site_domain_performance","timezone":"UTC","start_date":"%s","end_date":"%s","columns":["advertiser","campaign","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"row_per":["advertiser_id","campaign_id","site_domain"],"pivot_report":false,"fixed_columns":[],"show_usd_currency":false,"orders":["advertiser","campaign","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"],"name":" Report - 07\/22\/2014","ui_columns":["advertiser","campaign","site_domain","imps","clicks","click_thru_pct","convs_rate","booked_revenue","post_view_convs","post_click_convs","media_cost","profit_ecpm"]}}'

ADVERTISER_IDS = map(str, [185711,195681,225133,250058,251793,272759,274802,285817,302568,306383,306401,309251,312933,319800,338195,349923,356780])

DATA_PULLING_FORMS = '{ "report": { "report_type":"advertiser_analytics","timezone":"UTC","filters": [ { "seller_type": [ "Real Time" ] } ], "columns":[ "hour", "imps", "clicks","media_cost","advertiser_id","campaign_id","creative_id", "seller_type" ], "row_per":[ "hour","creative_id","campaign_id"], "timezone":"UTC","start_date":"%s","end_date":"%s", "format":"csv" } }'

DATA_PULLING_FORMS_2 = '{"report":{"special_pixel_reporting":false,"report_type":"network_advertiser_analytics","timezone":"UTC","start_date":"%s","end_date":"%s","row_per":["hour","campaign_id","line_item_id","creative_id"],"columns":["hour","campaign","line_item","creative","imps","clicks","click_thru_pct","total_convs","convs_rate","total_revenue","revenue_ecpm","revenue_ecpc","revenue_ecpa","media_cost","cost_ecpm","profit"],"pivot_report":false,"fixed_columns":["hour"],"show_usd_currency":false,"orders":["hour","campaign","line_item","creative","imps","clicks","click_thru_pct","total_convs","convs_rate","total_revenue","revenue_ecpm","revenue_ecpc","revenue_ecpa","media_cost","cost_ecpm","profit"],"name":"Bigstock Report - 07\/24\/2014","ui_columns":["hour","campaign","line_item","creative","imps","clicks","click_thru_pct","total_convs","convs_rate","total_revenue","revenue_ecpm","revenue_ecpc","revenue_ecpa","media_cost","cost_ecpm","profit"]}}'
