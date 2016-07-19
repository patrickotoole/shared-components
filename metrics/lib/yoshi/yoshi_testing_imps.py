import pandas as pd 
from datetime import datetime

CONV_RATES = '''
SELECT y.campaign_id, y.domain, v4.external_advertiser_id, v4.imps, v2.conv, (v4.imps / v2.conv) as imps_to_conv
FROM
(
    SELECT campaign_id, domain
    FROM rockerbox.yoshi_campaign_domains
    GROUP BY 1
) y
JOIN
(
    SELECT external_advertiser_id, campaign_id, SUM(imps) as imps
    FROM reporting.v4_reporting
    WHERE active = 1 AND deleted = 0 
    AND date >= date(DATE_SUB(CURDATE(),INTERVAL %(ndays)s DAY))
    AND external_advertiser_id = %(advertiser)s
    GROUP BY 1,2
) v4
ON (v4.campaign_id = y.campaign_id)
JOIN
(
    SELECT external_advertiser_id, campaign_id, COUNT(*) as conv, SUM(is_valid) as attr_conv
    FROM reporting.v2_conversion_reporting
    WHERE active = 1 AND deleted = 0
    AND conversion_time >= date(DATE_SUB(CURDATE(),INTERVAL %(ndays)s DAY))
    AND external_advertiser_id = %(advertiser)s
    GROUP BY 1,2
) v2
ON (y.campaign_id = v2.campaign_id)
WHERE imps > 1000
'''

            
SERVED_ADV = '''
SELECT DISTINCT external_advertiser_id FROM v2_conversion_reporting 
WHERE conversion_time >= date(DATE_SUB(CURDATE(),INTERVAL %s DAY))
'''

def extract(db, N = 30):
    data = pd.DataFrame()
    advertisers = lnk.dbs.reporting.select_dataframe(SERVED_ADV%N)['external_advertiser_id'].tolist()
    assert len(advertisers) > 0
    for a in advertisers:
        df = lnk.dbs.reporting.select_dataframe(CONV_RATES%{'advertiser':a, 'ndays':N})
        data = pd.concat([data,df])
    return data


def transform(data):

    assert len(data) > 0
    assert "campaign_id" in data.columns
    assert "domain" in data.columns
    assert "external_advertiser_id" in data.columns
    assert "imps" in data.columns
    assert "conv" in data.columns
    assert "imps_to_conv" in data.columns

    data['last_modified'] = datetime.now()
    data['conv_rate'] = data['conv'] / data['imps'].astype(float)
    data = data.reset_index(drop = True)

    assert "last_modified" in data.columns
    assert "conv_rate" in data.columns
    return data



def write_to_sql(db,df):
    from lib.appnexus_reporting.load import DataLoader

    loader = DataLoader(db)
    key = "campaign_id"
    columns = df.columns
    loader.insert_df(df,"yoshi_conv_rates",["campaign_id"],columns)

def run(reporting, rockerbox):

    data = extract(reporting)
    data = transform(data)
    write_to_sql(rockerbox, data)


if __name__ == "__main__":

    from link import lnk
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    from lib.report.utils.loggingutils import basicConfig

    define('console', default=True)

    parse_command_line()
    basicConfig(options=options)

    reporting = lnk.dbs.reporting
    rockerbox = lnk.dbs.rockerbox

    run(reporting, rockerbox)

