import logging
from lib.report.event.base import EventBase
from lib.report.utils.utils import decorator
from lib.report.utils.utils import local_now


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
        status = 0
        job_created_at = local_now()
        try:
            res = f(*args, **kwargs)
            status = 1
        except Exception as e:
            logging.warn(e)
        job_ended_at = local_now()
        event_name = filter(lambda a: isinstance(a, str), args)[0]
        start_date, end_date = kwargs.get('start_date'), kwargs.get('end_date')
        EventReport(event_name=event_name,
                    db_wrapper=kwargs.get('con'),
                    job_created_at=job_created_at,
                    job_ended_at=job_ended_at,
                    start_date=start_date,
                    end_date=end_date,
                    status=status,
                    table_name='event_report',
                    ).create_event()
        return res
    return _f
