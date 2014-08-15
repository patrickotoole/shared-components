from link import lnk

from lib.report.utils.reportutils import get_advertiser_ids
from lib.report.utils.utils import parse

dbs = lnk.dbs

v3_db = dbs.mysql
v4_db = dbs.roclocaltest

V3_QUERY = "select * from conversion_reporting where external_advertiser_id = %s"
V4_QUERY = "select * from v2_conversion_reporting where external_advertiser_id = %s"

COLUMNS =['pc', 'auction_id', "imp_time"]
INDEX=["campaign_id","creative_id","external_advertiser_id", "line_item_id", "conversion_time"]

def pull_advertiser_data(advertiser_id):
    dataframes = {
        "v3": v3_db.select_dataframe(V3_QUERY % advertiser_id),
        "v4": v4_db.select_dataframe(V4_QUERY % advertiser_id)
    }

    comparables = {}
    for k, df in dataframes.iteritems():
        comparables[k] = df.set_index(INDEX)[COLUMNS]

    return comparables

def compare_advertiser(comparables):
    joined_v3 = comparables['v3'].join(comparables['v4'],rsuffix="_v4")
    joined_v4 = comparables['v4'].join(comparables['v3'],rsuffix="_v3")

    return {
        "v4_null": joined_v3[joined_v3.pc_v4.isnull()],
        "v3_null": joined_v4[joined_v4.pc_v3.isnull()]
    }

def find_dates_missing(comps_null):
    return { k: df.groupby(level=4).count().get('imp_time')  for k, df in comps_null.iteritems() }

def _check(advertiser_id='195681'):
    comps = pull_advertiser_data(advertiser_id)
    comps_null = compare_advertiser(comps)
    dates_missing = find_dates_missing(comps_null)
    return dates_missing

def no_misses(d):
    if not d:
        return True
    if d.get('v4_null').empty and d.get('v3_null').empty:
        return True
    return False


def main():
    print "Compared at time: %s" % parse('0m')
    for advertiser_id in get_advertiser_ids():
        missed = _check(advertiser_id)
        if no_misses(missed):
            pass
        else:
            print ('Advertiser: %s' % advertiser_id)

            missed_v3 = missed.get('v3_null')
            if not missed_v3.empty:
                print ('Missing in production conversion_reporting')
                print missed.get('v3_null')
                print '\n'

            missed_v4 = missed.get('v4_null')
            if not missed_v4.empty:
                print ('Missing in wei localbox v2_conversion_reporting')
                print missed_v4
                print '\n'

    print '------------------------------------------'

if __name__ == '__main__':
    exit(main())
