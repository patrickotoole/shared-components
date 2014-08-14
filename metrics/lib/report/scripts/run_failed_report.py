import logging
from itertools import groupby
from datetime import timedelta

from lib.report.work.report import ReportWorker
from lib.report.utils.reportutils import get_db
from lib.report.utils.utils import align

db = None

def main():
    define('db')
    define('days', type=int, default=1)
    parse_command_line()

    global db
    db = get_db(options.db)
    rs = _failed_reports(options.days)
    if not rs:
        logging.info("Failed reporting not found")

    logging.info("Found %s missing|failed reports, re-runing reports for %s" % (len(rs), rs))
    for r in rs:
        start_date = r['start_date']
        end_date = r['end_date']
        event_name = r['event_name']
        logging.info("re-runing %s job for start_date: %s, end_date: %s" % (event_name, start_date, end_date))
        succ = ReportWorker(event_name, db,
                start_date=str(start_date),
                end_date=str(end_date),
                cache=True,
                )._work()
        logging.info("job for %s is | %s, start_date: %s, end_date: %s" % ( event_name, ['failed', 'succ'][succ], start_date, end_date))
        deactive_event(start_date, end_date, event_name)
    return

def _failed_reports(days=1):
    """
    @param days: int
    @return: list(dict)
    """
    hours = 24 * days
    r1 = _get_failed_reports(hours)
    r2 = _get_missed_reports(hours)
    return r1 + r2

def _get_failed_reports(hours):
    """
    @param : hours: int
    @return: list(dict(start_date, end_date, event_name))
    """
    q = """
        select distinct start_date, end_date, event_name from stats_event_report
        where status = 0 and active = 1 and
        start_date >= date_sub(CURDATE(), interval %d hour) and start_date < CURDATE()
        """
    q = q % hours
    d = db.select(q).as_dict()
    return d

def _get_missed_reports(hours):
    """
    @param : hours: int
    @return: list(dict(start_date, end_date, event_name)
    """
    #Hacky, currently only consider reports that ran hourly,
    #should make it generic to recognize what's missing even if there
    #were start_date and end_date ran accorss mutilple hours or days
    to_return = []
    q = """
        select start_date from stats_event_report
        where event_name = 'datapulling' and
        start_date > date_sub(CURDATE(), interval %d hour) and start_date < CURDATE();
        """
    q = q % hours
    dict_lis = db.select(q).as_dict()
    dict_lis = [
            list(d)
            for (_, d) in groupby(dict_lis, lambda x: x.get('start_date').day)
            ]
    hours = { i for i in range(0, 24) }
    for lis in dict_lis:
        hours_parsed = set(map(lambda x: x.get('start_date').hour, lis))
        misses = hours - hours_parsed
        base = align(timedelta(days=1), lis[0].get('start_date'))
        d_pairs = map(lambda m:_start_end(base, m), misses)
        [to_return.extend(d) for d in d_pairs]
    return to_return

def _start_end(base, h):
    """
    @param base: Datetime
    @param h   : int(hours)
    @return: list(dict)
    """
    start_date = base + timedelta(hours=h)
    end_date = base + timedelta(hours=(h+1))
    d1 = dict(start_date=str(start_date), end_date=str(end_date), event_name='datapulling')
    d2 = dict(start_date=str(start_date), end_date=str(end_date), event_name='conversions')
    return [d1, d2]

def deactive_event(start, end, name):
    """
    @param _id: int
    """
    q = "update stats_event_report set active=0 where status = 0 and start_date='%s' and end_date='%s' and event_name = '%s'" % (start, end, name)
    db.execute(q)
    db.commit()
    logging.info("deactived %s from %s -- %s" % (name, start, end))


if __name__ == '__main__':
    from tornado.options import define
    from tornado.options import options
    from tornado.options import parse_command_line
    exit(main())
