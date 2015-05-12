import sys
from link import lnk
from pandas import Series

db = lnk.dbs.rockerbox

QUERY = """
SELECT * FROM opt_config WHERE opt_type = "{}"
"""

CAMPAIGNS_QUERY = """
SELECT campaign_id
FROM opt_campaigns 
WHERE campaign_group_name = "{}"
"""

def get_campaigns(campaign_group_name):
    query = CAMPAIGNS_QUERY.format(campaign_group_name)
    campaigns = db.select_dataframe(query).campaign_id.tolist()
    return campaigns

def get_configs(opt_type):
    configs = {}
    df = db.select_dataframe(QUERY.format(opt_type))

    for name, group in df.groupby(["opt_type", "config_name"]):
        opt_type = name[0]
        config_name = name[1]

        params = Series(group.value.values, index=group.param).to_dict()
        configs[config_name] = params

        campaign_group_name = params["campaign_group_name"]
        params["campaigns"] = get_campaigns(campaign_group_name)

    return configs
