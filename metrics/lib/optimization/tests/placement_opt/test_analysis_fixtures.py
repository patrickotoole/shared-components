import pandas as pd


GOOD_RULE_GROUP_RESPONSE = u'[{"active":1,"rule_group_id":54,"rule_group_name":"multi_conv_placement_unprofitable","rule":"%(convs)s > 1","created":1426813683},{"active":1,"rule_group_id":54,"rule_group_name":"multi_conv_placement_unprofitable","rule":"%(profit)s < max(-1 * %(loss_limit)s, -1 * %(RPA)s * %(RPA_multiplier)s ) ","created":1426813683}]'


## TESTING evaluate_rows

GOOD_PLACEMENT_RULES = {'multi_conv_placement_unprofitable': 
                        {'metrics': ['convs', 'profit', 'loss_limit', 'RPA', 'RPA_multiplier'], 
                        'rule_group_id': 54, 
                        'conditions': ['%(convs)s > 1', '%(profit)s < max(-1 * %(loss_limit)s, -1 * %(RPA)s * %(RPA_multiplier)s ) ']}}

ROW_DICT_TRUE = {'RPA': 70, 
                'loss_limit': 5, 
                'profit': -10., 
                'convs': 2, 
                'RPA_multiplier': 1 }

ROW_DICT_FALSE = {'RPA': 70, 
                'loss_limit': 5, 
                'profit': -10., 
                'convs': 0, 
                'RPA_multiplier': 1 }

ROW_DICT_MISSING = {'RPA': 70, 
                'profit': -10., 
                'convs': 0, 
                'RPA_multiplier': 1 }


## TESTING reshape

GOOD_PLACEMENT_RULES_BAD_PLACEMENT = {'multi_conv_placement_unprofitable': 
            {'metrics': ['convs', 'profit', 'loss_limit', 'RPA', 'RPA_multiplier'], 
            'rule_group_id': 54, 
            'conditions': ['%(convs)s > 1', '%(profit)s < max(-1 * %(loss_limit)s, -1 * %(RPA)s * %(RPA_multiplier)s ) '],
            'placements': ["2"]
            }}

GOOD_PLACEMENT_RULES_GOOD_PLACEMENT = {'multi_conv_placement_unprofitable': 
            {'metrics': ['convs', 'profit', 'loss_limit', 'RPA', 'RPA_multiplier'], 
            'rule_group_id': 54, 
            'conditions': ['%(convs)s > 1', '%(profit)s < max(-1 * %(loss_limit)s, -1 * %(RPA)s * %(RPA_multiplier)s ) '],
            'placements': ["1243"],
            'metrics': ["convs", "profit", "loss_limit", "RPA", "RPA_multiplier"],
            'action':None

            }}

FIXTURE_DF = pd.DataFrame([{'imps_served_cutoff': 40000, 
                            'RPA': 70, 
                            'loss_limit': 0, 
                            'CTR': 0.0, 
                            'revenue': 0.0, 
                            'profit': -2, 
                            'served_ratio_cutoff': 0.80000000000000004, 
                            'imps_served_rbox': 115.0, 
                            'apnx_rbox_served_ratio': 0.98290598290598286, 
                            'CTR_cutoff': 0.050000000000000003, 
                            'convs': 0, 
                            'last_served_date': '2015-04-10', 
                            'media_cost': 0.040999000000000001, 
                            'RPA_multiplier': 1, 
                            'loaded_ratio_cutoff': 0.80000000000000004, 
                            'loaded': 96.0, 
                            'imps_served_apnx': 117, 
                            'clicks': 0, 
                            'num_days': 10, 
                            'loaded_ratio': 0.83478260869565213,
                            'placement_id': "1243"}] ).set_index('placement_id')



TO_RUN = { "1243" : 
            {
            "metrics": 
                {   "convs": 0,
                    "profit": -2,
                    "loss_limit":0,
                    "RPA": 70,
                    "RPA_multiplier":1
                },
            'rule_group_name': "multi_conv_placement_unprofitable",
            'action':None,
            'rule_group_id': 54
            }
        }








# 


