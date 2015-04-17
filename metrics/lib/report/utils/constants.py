import os
from link import lnk
from lib.report.utils.enum import Enum

"media cost under this amount is truncated"
THRESHOLD = 7

"metrics"
WORST = 'worst'
BEST = 'best'

NUM_TRIES = 25
LIMIT = 10
SLEEP = 6

"ndigit to round"
NDIGITS = 2

"set it to avoid, no division error or Inf values"
DAMPING_POINT = 0.

"value of inf cpas should be"
CPA_INF = 0

MILLION = 1000000
NO_CONVS = None

TYPE = 'network_analytics'
CONSOLE = None

DEFAULT_DB = lambda: lnk.dbs.rockerbox

COST_EFFICIENCY = 'cost_efficiency'
DOMAIN = 'site_domain'
DATA_PULL = 'datapulling'
CONVERSIONS = 'converstions'
GOOGLE_ADX = 'Google AdExchange (181)'
BOOKED_REV = 'booked_revenue'
IMPS = 'imps'
PC_CONVS = 'post_click_convs'
PV_CONVS = 'post_view_convs'
POST_CLICK = 'Post Click'
MEDIA_COST = 'media_cost'
PC_EXPIRE = 'post_click_expire_mins'
PV_EXPIRE = 'post_view_expire_mins'
CPA = 'cpa'
HEADERS = [
        MEDIA_COST,
        CPA,
        ]

GROUPS = [
    'site_domain',
    'campaign',
    'advertiser',
 ]

APPNEXUS_REPORT_GAP_HOURS = 5


ADMIN_EMAIL = 'admin@rockerbox.com'
RON_EMAIL = 'ron@rockerbox.com'
WEI_EMAIL = 'imweilu@gmail.com'


SENDGRID_USER = 'ronjacobson'
SENDGRID_PW = 'rockerbox13'

ROUND = 2

"request forms for reports"

DOMAIN_JSON_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "network_site_domain_performance",
        "timezone": "UTC",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "columns": [
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "row_per": [
            "site_domain"
        ],
        "pivot_report": false,
        "fixed_columns": [],
        "show_usd_currency": false,
        "orders": [
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "name": " Report - 07/21/2014",
        "ui_columns": [
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ]
    }
}"""

ADVERTISER_DOMAIN_LINE_ITEM_JSON_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "network_site_domain_performance",
        "timezone": "UTC",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "columns": [
            "advertiser",
            "line_item",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "row_per": [
            "advertiser_id",
            "line_item_id",
            "site_domain"
        ],
        "pivot_report": false,
        "fixed_columns": [],
        "show_usd_currency": false,
        "orders": [
            "advertiser",
            "line_item",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "name": " Report - 08/5/2014",
        "ui_columns": [
            "advertiser",
            "line_item",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ]
    }
}
"""

ANALYTICS_FORM = """
{
    "report": {
        "report_type": "advertiser_analytics",
        "timezone": "UTC",
        "filters": [
            {
                "seller_type": [
                    "Real Time"
                ]
            }
        ],
        "columns": [
            "hour",
            "imps",
            "clicks",
            "media_cost",
            "advertiser_id",
            "campaign_id",
            "creative_id",
            "seller_member",
            "line_item_id"
        ],
        "row_per": [
            "hour",
            "creative_id",
            "campaign_id"
        ],
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "format": "csv"
    }
}
"""

CONVERSIONS_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "attributed_conversions",
        "timezone": "utc",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "filters": [
            {
                "pixel_id": [
                    "%(pixel_id)s"
                ]
            }
        ],
        "columns": [
            "advertiser_id",
            "pixel_id",
            "pixel_name",
            "line_item_id",
            "line_item_name",
            "campaign_id",
            "campaign_name",
            "creative_id",
            "creative_name",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id",
            "auction_id",
            "external_data",
            "imp_time",
            "datetime"
        ],
        "row_per": [
            "pixel_id",
            "pixel_name",
            "line_item_id",
            "campaign_id",
            "creative_id",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id"
        ],
        "pivot_report": false,
        "fixed_columns": [
        ],
        "show_usd_currency": false,
        "orders": [
            "advertiser_id",
            "pixel_id",
            "pixel_name",
            "line_item_id",
            "line_item_name",
            "campaign_id",
            "campaign_name",
            "creative_id",
            "creative_name",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id",
            "auction_id",
            "external_data",
            "imp_time",
            "datetime"
        ],
        "name": "learnvest report - 07\/25\/2014",
        "ui_columns": [
            "pixel_id",
            "pixel_name",
            "line_item",
            "campaign",
            "creative",
            "post_click_or_post_view_conv",
            "order_id",
            "user_id",
            "auction_id",
            "external_data",
            "imp_time",
            "datetime"
        ],
        "filter_objects": {
            "pixels": [
                {
                    "id": "%(pixel_id)s",
                    "name": "lv - sign up"
                }
            ]
        }
    }
}"""



ADVERTISER_DOMAIN_JSON_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "network_site_domain_performance",
        "timezone": "UTC",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "columns": [
            "advertiser",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "row_per": [
            "advertiser_id",
            "site_domain"
        ],
        "pivot_report": false,
        "fixed_columns": [],
        "show_usd_currency": false,
        "orders": [
            "advertiser",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "name": " Report - 07/22/2014",
        "ui_columns": [
            "advertiser",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ]
    }
}"""

ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "network_site_domain_performance",
        "timezone": "UTC",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "columns": [
            "advertiser",
            "campaign",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "row_per": [
            "advertiser_id",
            "campaign_id",
            "site_domain"
        ],
        "pivot_report": false,
        "fixed_columns": [],
        "show_usd_currency": false,
        "orders": [
            "advertiser",
            "campaign",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ],
        "name": " Report - 07/22/2014",
        "ui_columns": [
            "advertiser",
            "campaign",
            "site_domain",
            "imps",
            "clicks",
            "click_thru_pct",
            "convs_rate",
            "booked_revenue",
            "post_view_convs",
            "post_click_convs",
            "media_cost"
        ]
    }
}"""

SEGMENT_FORM = """
{
    "report": {
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "report_type": "segment_load",
        "columns": [
            "segment_id",
            "segment_name",
            "day",
            "total_loads",
            "daily_uniques",
            "monthly_uniques"
        ],
        "groups": [
            "segment_id",
            "day",
            "month"
        ],
        "orders": [
            "day"
        ],
        "format": "csv"
    }
}
"""

GEO_FORM = """
{
    "report": {
        "special_pixel_reporting": false,
        "report_type": "geo_analytics",
        "timezone": "UTC",
        "start_date": "%(start_date)s",
        "end_date": "%(end_date)s",
        "row_per": [
            "advertiser_id",
            "day",
            "geo_dma",
            "geo_region_id"
        ],
        "columns": [
            "advertiser",
            "day",
            "geo_dma",
            "geo_region",
            "imps",
            "clicks",
            "click_thru_pct",
            "total_convs",
            "convs_rate",
            "booked_revenue",
            "cost",
            "profit",
            "cpm"
        ],
        "filters": [
            {
                "geo_country_code": [
                    "US"
                ]
            }
        ],
        "pivot_report": false,
        "fixed_columns": [],
        "show_usd_currency": false,
        "orders": [
            "advertiser",
            "day",
            "geo_dma",
            "geo_region",
            "imps",
            "clicks",
            "click_thru_pct",
            "total_convs",
            "convs_rate",
            "booked_revenue",
            "cost",
            "profit",
            "cpm"
        ],
        "name": " Report - 10/17/2014",
        "ui_columns": [
            "advertiser",
            "day",
            "geo_dma",
            "geo_region",
            "imps",
            "clicks",
            "click_thru_pct",
            "total_convs",
            "convs_rate",
            "booked_revenue",
            "cost",
            "profit",
            "cpm"
        ],
        "filter_objects": [],
        "format": "csv"
    }
}
"""

FORM_HEADERS = {
    'content-type': 'text/html',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip,deflate,sdch',
    'Accept-Language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4,zh-TW;q=0.2',
    'DNT': '1',
}
