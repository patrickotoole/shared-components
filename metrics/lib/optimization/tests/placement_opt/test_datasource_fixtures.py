import pandas as pd


FIXTURE_APNX_DATA_GOOD = pd.DataFrame([
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

FIXTURE_APNX_DATA_BAD_DAY_STR = pd.DataFrame([
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

FIXTURE_APNX_DATA_EMPTY_DF = pd.DataFrame(columns = ["imps","hour"])


FIXTURE_RBOX_GOOD = pd.DataFrame([
        {

            'campaign': "7320174",
            'tag': "1243",
            'imps_served': 1000, 
            'loaded': 800
        },
        {

            'campaign': "7320174",
            'tag': "1243",
            'imps_served': 1000, 
            'loaded': 800
        }
        ])

FIXTURE_MERGED_DF = pd.DataFrame( [{ 'placement_id': "1243",
                                    'last_served_date': "2015-03-04",
                                    'num_days': 2,
                                    'imps_served_apnx': 2000,
                                    'convs': 20,
                                    'clicks': 100,
                                    'media_cost': 200.,
                                    'revenue': 200.,
                                    'profit': 0.,
                                    'imps_served_rbox':  2000,
                                    'loaded': 1600
                                    }] ).set_index('placement_id')





FIXTURE_PARAM = {   'RPA_multipliers':[1,2,3], 
                    'loss_limits':[1,2,3],
                    'RPA': 2, 'imps_served_cutoff':1000, 
                    'CTR_cutoff':.004,
                    'served_ratio_cutoff':0.8, 
                    'loaded_ratio_cutoff':0.8
                }






