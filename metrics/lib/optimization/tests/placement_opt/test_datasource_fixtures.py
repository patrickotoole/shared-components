import pandas as pd

# Fixtures
REPORT = """
{ 
    "report": { 
        "report_type":"advertiser_analytics", 
        "columns": [ 
            "hour",
            "day",
            "seller_member", 
            "placement_id", 
            "campaign_id", 
            "imps", 
            "clicks", 
            "total_convs",
            "media_cost",
            "total_revenue"
        ], 
         "start_date": "%(start_date)s",
        "end_date": "%(end_date)s", 
        "format":"csv" 
    } 
}
"""

FIXTURE1 = pd.DataFrame([
        {

            'imps': 1000, 
            'hour': "10", 
            'total_convs': 10, 
            'total_revenue': 100., 
            'placement_id': 1243, 
            'campaign_id': 7320174, 
            'clicks': 50, 
            'media_cost': 100., 
            'seller_member': "", 
            'day':  "2015-03-03"
        },
        {

            'imps': 1000, 
            'hour': "10", 
            'total_convs': 10, 
            'total_revenue': 100., 
            'placement_id': 1243, 
            'campaign_id': 7320174, 
            'clicks': 50, 
            'media_cost': 100., 
            'seller_member': "", 
            'day':  "2015-03-04"
        }
        ])

FIXTURE_BAD_DAY_STR = pd.DataFrame([
        {

            'imps': 1000, 
            'hour': "10", 
            'total_convs': 10, 
            'total_revenue': 100., 
            'placement_id': 1243, 
            'campaign_id': 7320174, 
            'clicks': 50, 
            'media_cost': 100., 
            'seller_member': "", 
            'day':  "2015-033-03"
        }])

FIXTURE_EMPTY_DF = pd.DataFrame(columns = ["imps","hour"])

FIXTURE_DF = { 'placement_id': 1273,
                'last_served_date': "2015-03-04",
                'num_days': 2,
                'imps_served': 2000,
                'convs': 0,
                'clicks': 100,
                'media_cost': 4,
                'revenue': 0,
                'profit': -4
            }

FIXTURE_PARAM = {'RPA_multipliers':[1,2,3], 'loss_limits':[1,2,3],
                    'RPA': 2, 'imp_served_cutoff':1000, 'CTR_cutoff':.004}