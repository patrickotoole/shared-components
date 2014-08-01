import logging
from lib.report.event.base import EventBase
from lib.report.utils.utils import decorator
from lib.report.utils.utils import local_now
from lib.report.utils.utils import get_dates


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
        job_created_at = local_now()
        try:
            res = f(*args, **kwargs)
            status = 1
        except Exception as e:
            logging.warn(e)
            error = e
        job_ended_at = local_now()
        _kwargs = _get_kwargs(*args, **kwargs)
        _kwargs.update(dict(job_created_at=job_created_at,
                            job_ended_at=job_ended_at,
                            status=status,
                            table_name='stats_event_report',
                            ))
        EventReport(**_kwargs).create_event()
        if error:
            raise ValueError(e)
        return res
    return _f

def _get_kwargs(*args, **kwargs):
    event_name = kwargs.get('name') or filter(lambda a: isinstance(a, str), args)[0]
    db_wrapper = kwargs.get('con') or filter(lambda a: 'dbwrappers' in a.__str__(), args)[0]
    end_date, lookback = kwargs.get('start_date'), kwargs.get('lookback')
    start_date, end_date = get_dates(end_date, lookback)
    return dict(event_name=event_name,
                db_wrapper=db_wrapper,
                start_date=start_date,
                end_date=end_date,
                )
