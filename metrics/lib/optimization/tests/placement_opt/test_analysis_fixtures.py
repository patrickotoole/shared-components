import pandas as pd

PLACEMENT_RULE_MISSING_GROUP_ID = { 

    'no_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "No convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT',
    },

    'one_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "One convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT'
    },

    'multi_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "Multi convs/unprofitable: (MEDIA TRADER INVESTIGATE)",
            'action': None,

    },

    'no_conv_placement_clickfraud': {
            'metrics': ['convs', 'CTR', 'CTR_cutoff', 'imps_served', 'imp_served_cutoff'],
            'desc': "No convs/click fraud:",
            'action': 'EXCLUDE_PLACEMENT'
    }
}

PLACEMENT_RULE_WITH_PLACEMENTS = { 

    'no_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "No convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT',
            'placements': [],
            'rule_group_id':1

    },

    'one_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "One convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT',
            'placements': [],
            'rule_group_id':2
    },

    'multi_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'desc': "Multi convs/unprofitable: (MEDIA TRADER INVESTIGATE)",
            'action': None,
            'placements': [],
            'rule_group_id':3

    },

    'no_conv_placement_clickfraud': {
            'metrics': ['convs', 'CTR', 'CTR_cutoff', 'imps_served', 'imp_served_cutoff'],
            'desc': "No convs/click fraud:",
            'action': 'EXCLUDE_PLACEMENT',
            'placements': [2],
            'rule_group_id':4
    }
}

GOOD_RULE_GROUP_RESPONSE = u'[{"active":1,"rule_group_id":54,"rule_group_name":"multi_conv_placement_unprofitable","rule":"%(convs)s > 1","created":1426813683},{"active":1,"rule_group_id":54,"rule_group_name":"multi_conv_placement_unprofitable","rule":"%(profit)s < max(-1 * %(loss_limit)s, -1 * %(RPA)s * %(RPA_multiplier)s ) ","created":1426813683}]'

DF = pd.DataFrame([ { 'placement_id': 1243,
                    'last_served_date': "2015-03-05",
                    'num_days': 2,
                    'imps_served': 2000,
                    'convs': 20,
                    'clicks': 100,
                    'media_cost': 200,
                    'revenue': 200,
                    'profit': 0 ,
                    'CTR': .2,
                    'RPA': 10,
                    'RPA_multiplier':1,
                    'loss_limit': 10,
                    'imp_served_cutoff': 100,
                    'CTR_cutoff':.4} ] ).set_index('placement_id')
