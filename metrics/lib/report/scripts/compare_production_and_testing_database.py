import logging
import pandas as pd

from link import lnk

from lib.report.utils.reportutils import get_advertiser_ids
from lib.report.utils.utils import parse
from lib.report.utils.loggingutils import basicConfig

dbs = lnk.dbs

QUERY = "select * from %s where external_advertiser_id = %s"

V3_V4_COLS = ['imps','clicks','media_cost']
V3_V4_IDX = ["campaign_id","creative_id","external_advertiser_id","date"]

V1_V2_COLS =['pc', 'auction_id', "imp_time"]
V1_V2_IDX=["campaign_id","creative_id","external_advertiser_id", "conversion_time"]

def _get_old_db():
    db = dbs.mysql
    return db

def _get_new_db():
    return dbs.roclocaltest


def _pull_advertiser_data(advertiser_id=None,
        old_table=None,
        new_table=None,
        index=None,
        columns=None,
        ):
    old_query = QUERY % ( old_table, advertiser_id )
    new_query = QUERY % ( new_table, advertiser_id )

    old_db = _get_old_db()
    new_db = _get_new_db()
    dataframes = {
        "old": old_db.select_dataframe(old_query % advertiser_id),
        "new": new_db.select_dataframe(new_query % advertiser_id)
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
        missed_old = dates_missing.get('old_null')
        missed_new = dates_missing.get('new_null')

        def _log(miss, db, table):
            if _is_dataframe(miss):
                if not miss.empty:
                    logging.warn(
                    'Advertiser: {advertiser_id}, missing in {database} | table: {table}, {messegae}'.format(
                            advertiser_id=advertiser_id,
                            database=db,
                            table=table,
                            messegae=miss,
                            ))
                    return
            logging.info('Advertiser: %s no misses' % advertiser_id)

        old_db = _get_old_db()
        new_db = _get_new_db()
        _log(missed_old, old_db.database, old_table)
        _log(missed_new, new_db.database, new_table)

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
    parse_command_line()
    basicConfig(options=options)

    logging.info("Compared at time: %s" % parse('0m'))
    cmp_v3_v4_reporting()
    cmp_v1_v2_conversion_reporting()


if __name__ == '__main__':
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    exit(main())
