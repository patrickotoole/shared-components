def no_conv_placement_unprofitable(row):
    return row['convs'] == 0 and row['profit'] < max(-1 * row['loss_limit'], -1 * row['RPA_multiplier'] * row['RPA'])

def one_conv_placement_unprofitable(row):
    return row['convs'] == 1 and row['profit'] < max(-1 * row['loss_limit'], -1 * row['RPA_multiplier'] * row['RPA'])

def multi_conv_placement_unprofitable(row):
    return row['convs'] > 1 and row['profit'] < max(-1 * row['loss_limit'], -1 * row['RPA_multiplier'] * row['RPA'])

def no_conv_placement_clickfraud(row):
    return row['convs'] == 0 and row['CTR'] >= row['CTR_cutoff'] and row['imps_served'] >= row['imp_served_cutoff']

PLACEMENT_RULES = { 

    'no_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'filter': lambda row: no_conv_placement_unprofitable(row),
            'desc': "No convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT',
    },

    'one_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'filter': lambda row: one_conv_placement_unprofitable(row),
            'desc': "One convs/unprofitable:",
            'action': 'EXCLUDE_PLACEMENT'
    },

    'multi_conv_placement_unprofitable': {
            'metrics': ['convs', 'profit', 'loss_limit', 'RPA_multiplier', 'RPA'],
            'filter': lambda row: multi_conv_placement_unprofitable(row),
            'desc': "Multi convs/unprofitable: (MEDIA TRADER INVESTIGATE)",
            'action': None

    },

    'no_conv_placement_clickfraud': {
            'metrics': ['convs', 'CTR', 'CTR_cutoff', 'imps_served', 'imp_served_cutoff'],
            'filter': lambda row: no_conv_placement_clickfraud(row),
            'desc': "No convs/click fraud:",
            'action': 'EXCLUDE_PLACEMENT'
    }
}
