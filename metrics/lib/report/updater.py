import logging
from datetime import datetime

from lib.report.utils.options import define
from lib.report.utils.options import options
from lib.report.utils.options import parse_command_line
from lib.pandas_sql import s as _sql
from lib.report.utils.utils import get_start_end_date
from lib.report.utils.utils import datetime_to_str
from lib.report.utils.loggingutils import basicConfig
from lib.report.utils.reportutils import get_report_obj
from lib.report.utils.reportutils import get_db
from lib.report.utils.reportutils import get_advertiser_ids
from lib.report.utils.reportutils import write_mysql
from lib.report.event.base import EventBase

ERROR_CODE = 1

def main():
    define('reports', type=str, multiple=True)
    define('include_manual', type=bool, default=False)
    define('external_advertiser_ids', type=int, multiple=True)
    define('start_date', default='7h')
    define('end_date', default='6h')
    define('align', default='hours')
    define("db", type=str, default=None, help="choose which database to write to")
    define('limit', type=int, default=None)

    parse_command_line()
    basicConfig(options=options)

    db = get_db(options.db)
    reports = _reports_to_run(db, options.reports, include_manual=options.include_manual)
    start_date, end_date = get_start_end_date(options.start_date,
            options.end_date, options.align)
    assert start_date < end_date

    failed = 0
    for _, report in reports.iterrows():
        name, table = report['name'], report['table']
        succ = update(
            db=db,
            start_date=start_date,
            end_date=end_date,
            table=table,
            name=name,
            external_advertiser_ids=options.external_advertiser_ids,
        )
        if not succ:
            failed = 1
    if failed:
        raise SystemExit, ERROR_CODE

def update(db=None, start_date=None, end_date=None,
           table=None,
           name=None,
           limit=None,
           external_advertiser_ids=None,
           ):
    report_obj = get_report_obj(name)
    obj = report_obj(db=db,
                     start_date=start_date,
                     end_date=end_date,
                     name=name,
                     )

    job_created_at = datetime_to_str(datetime.now())
    total_rows = 0
    status = 1
    rows_before = _get_rows_count(db, table)
    error_advertiser_ids = []
    external_advertiser_ids = external_advertiser_ids or _get_external_advertiser_ids(obj)

    for external_advertiser_id in external_advertiser_ids:
        logging.info("Getting reports %s: %s - %s, external_advertiser_id: %s" % (name, start_date, end_date, external_advertiser_id))
        rows = 0

        # the len(df) decrease after analyzed. Not sure how to compare those two
        try:
            df = obj.get_reports(external_advertiser_id=external_advertiser_id, limit=limit)
            rows = len(df)

            if not rows:
                logging.debug("report empty")
                continue

            df = obj.analyzer.analyze(df)
            write_mysql(df, table=table, con=db)
            _integrity_check(db=db, df=df,
                             table=table,
                             date_column=obj.date_column,
                             start_date=start_date,
                             end_date=end_date,
                             external_advertiser_id=external_advertiser_id,
                             limit=limit,
                             )
        except Exception as e:
            error = str(e)
            logging.exception(error)
            status = 0
            error_advertiser_ids.append(external_advertiser_id)
            _save_report_advertiser_stats(start_date=start_date, end_date=end_date,
                                          error=error,
                                          rows=rows,
                                          external_advertiser_id=external_advertiser_id or None,
                                          report_name=name,
                                          db_wrapper=db,
                                          )
        total_rows += rows

    rows_after = _get_rows_count(db, table)
    _save_report_stats(start_date=start_date, end_date=end_date,
                       error_advertiser_ids=','.join(map(str, error_advertiser_ids)) or None,
                       rows_df=total_rows,
                       rows_inserted=(rows_after-rows_before),
                       report_name=name,
                       db_wrapper=db,
                       job_created_at=job_created_at,
                       job_ended_at=datetime_to_str(datetime.now()),
                       status=status,
                       )
    return status

def _get_external_advertiser_ids(obj):
    return get_advertiser_ids() if obj.require_external_advertiser_ids else [""]

def _get_rows_count(db, table):
    df = db.select_dataframe("select count(*) c from %s" % table)
    return df['c'][0]

# todo segments's datecolumn dont really work.
def _integrity_check(db=None, df=None, **kwargs):
    q = _get_query(**kwargs)
    db_df = db.select_dataframe(q)[list(df.columns)]
    try:
        assert sorted(df.to_csv(index=False)) == sorted(db_df.to_csv(index=False))
    except:
        raise ValueError("csv not equal")

# todo if not date column just use limit (len of the dataframe)
def _get_query(**kwargs):
    q = "select * from {table} where {date_column} >= '{start_date}' and {date_column} < '{end_date}' "
    if kwargs.get('external_advertiser_id'):
        q += " and external_advertiser_id = {external_advertiser_id}"
    q += ' order by {date_column}'
    if kwargs.get('limit'):
        q += " and limit = {limit}"
    return q.format(**kwargs)

def _save_report_advertiser_stats(**kwargs):
    logging.info("saving stats_reportadvertiser {report_name}, {start_date}-{end_date}, external_advertiser_id: {external_advertiser_id}, num_rows: {rows}, error: {error}".format(**kwargs))
    kwargs['table_name'] = 'stats_reportadvertiser'
    e = EventBase(**kwargs)
    e.create_event()

def _save_report_stats(**kwargs):
    logging.info("saving stats_report {report_name} - status: {status}, {start_date}-{end_date}, error_external_advertiser_ids: {error_advertiser_ids}, rows from appnexus: {rows_df}, rows inserted: {rows_inserted}".format(**kwargs))
    kwargs['table_name'] = 'stats_report'
    e = EventBase(**kwargs)
    e.create_event()

def _reports_to_run(db, names, include_manual=False):
    df = db.select_dataframe("select * from reporting.report")
    logging.info("found %s reports: %s" % (len(df), list(df.name)))
    if names:
        df = df[df.name.isin(names)]
    if not include_manual:
        df = df[df.manual == 0]
    logging.info("found %s reports to run: %s" % (len(df), list(df.name)))
    return df

if __name__ == '__main__':
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    from lib.report.utils.loggingutils import basicConfig
    exit(main())
