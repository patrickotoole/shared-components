"""
script to hourly/daily rerun failed/missed conversion and datapulling report jobs.
"""

import logging
from datetime import timedelta

from lib.report.work.report import ReportWorker
from lib.report.utils.reportutils import get_db
from lib.report.utils.utils import align
from lib.report.utils.utils import parse
from lib.report.utils.loggingutils import basicConfig
from lib.report.utils.utils import get_start_end_date
from lib.report.utils.utils import datetime_to_str


db = None
HOUR = timedelta(hours=1)

MISSED_QUERY = """
   select distinct start_date from stats_event_report
   where event_name = 'datapulling' and
   start_date >= '{start_date}' and start_date <= '{end_date}';
   """

FAILED_QUERY = """
   select distinct start_date, end_date, event_name from stats_event_report
   where status = 0 and active = 1 and
   start_date >= '{start_date}' and start_date <= '{end_date}'
   """

def rerun_previous_day():
    start_date, end_date = get_start_end_date('1d', '0m', units='days')
    to_run = _create_missed_dict(start_date, end_date)
    _run(to_run)

def check(hours=1):
    """
    re-run all the jobs that's either missing or fails * hours ealier
    """
    end_date = align(timedelta(hours=1), parse("6h")).replace(tzinfo=None)
    start_date = end_date - timedelta(hours=hours)
    missed = _get_miss(start_date, end_date)
    failed = _get_fail(start_date, end_date)
    to_run = missed + failed
    _run(to_run)

def _get_fail(start_date, end_date):
    q = FAILED_QUERY.format(start_date=datetime_to_str(start_date), end_date=datetime_to_str(end_date))
    return db.select_dataframe(q).to_dict(outtype='records')

def _run(to_rerun):
    """
    @param to_rerun: list(dict(start_date, end_date, event_name))
    """
    if not to_rerun:
        logging.info("Failed reporting not found")
    logging.info("Found %s missing|failed reports, re-runing reports for %s" % (len(to_rerun), to_rerun))
    for r in to_rerun:
        start_date = r['start_date']
        end_date = r['end_date']
        event_name = r['event_name']
        logging.info("re-runing %s job for start_date: %s, end_date: %s" % (event_name, start_date, end_date))
        try:
            succ = ReportWorker(event_name, db,
                    start_date=str(start_date),
                    end_date=str(end_date),
                    cache=True,
                    )._work()
            logging.info("job for %s is | %s, start_date: %s, end_date: %s" % ( event_name, ['failed', 'succ'][succ], start_date, end_date))
        except Exception:
            logging.warn("re-runing %s failed for start_date: %s, end_date: %s" % (event_name, start_date, end_date))
            pass
        try:
            deactive_event(start_date, end_date, event_name)
        except Exception:
            logging.warn("error when deactiving %s from %s -- %s failed" % (event_name, start_date, end_date))
            pass
    return

def _get_miss(start_date, end_date):
    """
    @param start_date : Datatime
    @param end_date : Datatime
    @return: list(dict(start_date, end_date, event_name))
    """
    to_run = []
    parsed = _get_parsed(start_date, end_date, MISSED_QUERY)
    while start_date < end_date:
        if not start_date in parsed:
            _end = start_date + HOUR
            to_run.extend(_create_missed_dict(start_date, _end))
        start_date += HOUR
    return to_run

def _get_parsed(start_date, end_date, query):
    """
    @param start_date: Datetime
    @param end_date  : Datetime
    @return          : set(datetime)
    """
    query = query.format(start_date=datetime_to_str(start_date), end_date=datetime_to_str(end_date))
    return set(map(str, db.select_dataframe(query).start_date.tolist()))

def _create_missed_dict(start_date, end_date):
    names = ['datapulling', 'conversions']
    return [_create_dict(start_date, end_date, name) for name in names]

def _create_dict(start_date, end_date, name):
    return {
            'start_date': start_date,
            'end_date': end_date,
            'event_name': name,
            }

def deactive_event(start, end, name):
    """
    @param _id: int
    """
    def _h(t):
        return t if isinstance(t, str) else datetime_to_str(t)
    q = "update stats_event_report set active=0 where status = 0 and start_date>='%s' and end_date<='%s' and event_name = '%s'" % (_h(start), _h(end), name)
    db.execute(q)
    db.commit()
    logging.info("deactived %s from %s -- %s, changed status to 0" % (name, start, end))


def main():
    define('db')
    define('hours', type=int, default=1)
    define('daily', type=bool, default=False)

    parse_command_line()
    basicConfig(options=options)

    global db
    db = get_db(options.db)
    if options.daily:
        rerun_previous_day()
        return
    check(options.hours)

if __name__ == '__main__':
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line
    exit(main())
