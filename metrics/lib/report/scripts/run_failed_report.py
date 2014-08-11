import logging

from lib.report.work.report import ReportWorker
from lib.report.reportutils import get_db

db = None

def main():
    define('db')
    parse_command_line()
    global db
    db = get_db(options.db)
    if not db:
        logging.warn("No db selected")
    rs = _get_failed_reports()
    if not rs:
        logging.info("Failed reporting not found")
    for r in rs:
        logging.info("re-runing %s job for start_date: %s, end_date: %s" % (r['event_name'], r['start_date'], r['end_date']))
        succ = ReportWorker(r['event_name'],
                db,
                start_date=str(r['start_date']),
                end_date=str(r['end_date']),
                cache=True,
                )._work()
        logging.info("job for %s is | %s, start_date: %s, end_date: %s" % (
                r['event_name'], ['failed', 'succ'][succ],
                r['start_date'], r['end_date']))
        deactive_event(r['id'])
    return

def _get_failed_reports():
    """
    @return: list(dict(start_date, end_date, event_name))
    """
    query = "select start_date, end_date, event_name, id from stats_event_report where status = 0 and active = 1"
    d = db.select(query).as_dict()
    return d

def deactive_event(_id):
    q = "update stats_event_report set active=0 where id=%s" % _id
    db.execute(q)
    db.commit()


if __name__ == '__main__':
    from tornado.options import define
    from tornado.options import options
    from tornado.options import parse_command_line
    exit(main())
