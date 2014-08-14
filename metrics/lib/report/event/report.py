import logging

from lib.report.event.base import EventBase
from lib.report.utils.utils import decorator
from lib.report.utils.utils import local_now
from lib.report.utils.utils import datetime_to_str


class EventReport(EventBase):
    def __init__(self,
            event_name=None,
            db_wrapper=None,
            table_name=None,
            job_created_at=None,
            job_ended_at=None,
            start_date=None,
            end_date=None,
            status=None,
            ):
        self.event_name = event_name
        self.job_created_at = job_created_at
        self.job_ended_at = job_ended_at
        self.start_date = start_date
        self.end_date = end_date
        self.status = status
        self.db_wrapper = db_wrapper
        self.table_name = table_name

@decorator
def accounting(f):
    def _f(*args, **kwargs):
        error = None
        status = 0
        job_created_at = datetime_to_str(local_now())

        worker = args[0]
        start_date = worker._kwargs.get('start_date')
        end_date = worker._kwargs.get('end_date')
        event_name=worker._name

        try:
            res = f(*args, **kwargs)
            if res:
                status = 1
                logging.info("succeed: job for %s: %s - %s" % (event_name, start_date, end_date))
        except Exception as e:
            logging.warn(e)
            logging.warn("failed: job for %s: %s - %s" % (event_name, start_date, end_date))
            error = e

        job_ended_at = datetime_to_str(local_now())
        logging.info("creating event for %s, start_date: %s, end_date: %s, status: %s" % (worker._name, start_date, end_date, status))
        EventReport(
                event_name=worker._name,
                db_wrapper=worker._con,
                table_name='stats_event_report',
                job_created_at=job_created_at,
                job_ended_at=job_ended_at,
                start_date=start_date,
                end_date=end_date,
                status=status,
                ).create_event()
        if error:
            raise ValueError(e)
        return status
    return _f
