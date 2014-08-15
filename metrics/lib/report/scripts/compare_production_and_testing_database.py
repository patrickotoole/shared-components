import logging
import pandas as pd

from link import lnk

from lib.report.utils.reportutils import get_advertiser_ids
from lib.report.utils.utils import parse

dbs = lnk.dbs

OLD_DB = dbs.mysql
NEW_DB = dbs.roclocaltest

QUERY = "select * from %s where external_advertiser_id = %s"

V3_V4_COLS = ['imps','clicks','media_cost']
V3_V4_IDX = ["campaign_id","creative_id","external_advertiser_id","date"]

V1_V2_COLS =['pc', 'auction_id', "imp_time"]
V1_V2_IDX=["campaign_id","creative_id","external_advertiser_id", "conversion_time"]


def _pull_advertiser_data(advertiser_id=None,
        old_table=None,
        new_table=None,
        index=None,
        columns=None,
        ):
    old_query = QUERY % ( old_table, advertiser_id )
    new_query = QUERY % ( new_table, advertiser_id )

    dataframes = {
        "old": OLD_DB.select_dataframe(old_query % advertiser_id),
        "new": NEW_DB.select_dataframe(new_query % advertiser_id)
    }

    comparables = {}
    for k, df in dataframes.iteritems():
        comparables[k] = df.set_index(index)[columns]

    return comparables

def _compare_advertiser(comparables, elem):
    """
    @param comparables: dict(str, DataFrame)
    @param elem       : str
    @return:
    """
    joined_old = comparables['old'].join(comparables['new'],rsuffix="_new")
    joined_new = comparables['new'].join(comparables['old'],rsuffix="_old")

    old_elem = '%s_old' % elem
    new_elem = '%s_new' % elem

    return {
        "new_null": joined_old[joined_old[new_elem].isnull()],
        "old_null": joined_new[joined_new[old_elem].isnull()]
    }

def _find_dates_missing(comps_null, col, level=3):
    return { k: df.groupby(level=level).count().get(col) for k, df in comps_null.iteritems() }

def _has_misses(d):
    """
    @param d: dict(GroupedDataFrame)
    @return : bool
    """
    return any(_is_dataframe(d) and not v.empty
               for k, v in d.iteritems())

def _is_dataframe(thing):
    return (isinstance(thing, pd.DataFrame) or isinstance(thing, pd.Series))

def compare(old_table=None, new_table=None,
        elem=None,
        col=None,
        level=None,
        index=None,
        columns=None,
        ):
    """
    @param old_table    : str
    @param new_table    : str
    @param elem         : str(column name, when it's row's value is null, it means it's missing)
    @param col          : str
    @param level        : int|str(level_name) used as time stamp to identify what's missing
    @param index        : list(str)
    @param columns      : list(str)
    @return             : dict(GroupedDataFrame)
    """
    for advertiser_id in get_advertiser_ids():
        comps = _pull_advertiser_data(advertiser_id=advertiser_id,
                old_table=old_table,
                new_table=new_table,
                index=index,
                columns=columns,
                )
        comps_null = _compare_advertiser(comps,elem)
        dates_missing = _find_dates_missing(comps_null, col, level=level)

        if _has_misses(dates_missing):
            print ('Advertiser: %s' % advertiser_id)
            missed_old = dates_missing.get('old_null')
            missed_new = dates_missing.get('new_null')

            if _should_print(missed_old):
                print ('Missing in production database %s: %s' % (OLD_DB.database, old_table))
                print missed_old
                print '\n'

            if _should_print(missed_new):
                print ('Missing in test database %s: %s' % (NEW_DB.database, new_table))
                print missed_new
                print '\n'

    print '------------------------------------------'

def _should_print(missed):
    if _is_dataframe(missed):
        if not missed.empty:
            return True
    return False


def cmp_v3_v4_reporting():
    logging.info("compareing v4_reporting with production v3_reporting")
    return compare(old_table='v3_reporting',
            new_table='v4_reporting',
            elem='media_cost',
            col='imps',
            level='date',
            index=V3_V4_IDX,
            columns=V3_V4_COLS,
            )

def cmp_v1_v2_conversion_reporting():
    logging.info("compareing v2_conversion_reporting with production conversion_reporting")
    return compare(old_table='conversion_reporting',
            new_table='v2_conversion_reporting',
            elem='imp_time',
            col='imp_time',
            level='conversion_time',
            index=V1_V2_IDX,
            columns=V1_V2_COLS,
            )

def main():
    print "Compared at time: %s" % parse('0m')
    cmp_v3_v4_reporting()
    cmp_v1_v2_conversion_reporting()


if __name__ == '__main__':
    exit(main())
