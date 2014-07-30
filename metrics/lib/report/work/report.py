import logging
import pandas as pd

from lib.report.work.base import BaseWorker
from lib.pandas_sql import s as _sql
from lib.report.utils.utils import local_now
from lib.report.utils.utils import get_dates
from lib.report.reportutils import get_db
from lib.report.reportutils import get_report_obj

class UnableGetReporError(ValueError):
    pass


class ReportWorker(BaseWorker):
    def __init__(self, name, _db=None):
        self._db = _db or get_db()
        self._name = name

    def do_work(self, **kwargs):
        """
        @return: bool, True if successful, False otherwise
        """
        job_created_at = kwargs.get('job_created_at') or local_now()
        status =  None

        try:
            self._work(**kwargs)
            status = True
        except UnableGetReporError:
            logging.info("report job -- %s, failed" % self._name)
            status = False
        con = self._db

        event_kwargs = _get_kwargs_for_reportevent(kwargs, job_created_at, status, self._name)
        _create_report_events(con, **event_kwargs)
        return status

    def _work(self, **kwargs):
        _obj = get_report_obj(self._name)
        table_name = _obj._table_name
        key = _obj._get_unique_table_key()
        try:
            df = _obj.get_report(**kwargs)
        except Exception as e:
            logging.warn(e)
            raise UnableGetReporError(e)
        con = self._db
        col_names = df.columns.tolist()
        logging.info("inserting into table: %s, cols: %s" % (table_name, col_names))
        _sql._write_mysql(df, table_name, col_names, con.cursor(), key=key)
        con.commit()

def _get_table_name(name):
    return ('v4_reporting' if name == 'datapulling' else
            'domain_reporting' if name == 'domain' else
            'conversion_reporting')

def _create_report_events(con, **kwargs):
    df = pd.DataFrame([kwargs])
    logging.info("creating report event")
    cur = con.cursor()
    _sql._write_mysql(df, "reportevent", df.columns.tolist(), cur, key=None)
    con.commit()

def _get_kwargs_for_reportevent(kwargs, job_created_at, status, name):
    """
    @return: dict(start: str(time), end: str(time), status: bool,
                  success: str(time), failure: str(time), name: str(reportname))
    """
    start, end = get_dates(end_date=kwargs['end_date'], lookback=kwargs['lookback'])
    success = failure = None
    if status:
        success = job_created_at
    else:
        failure = job_created_at
    return dict(start=start,
                end=end,
                status=status,
                success=success,
                failure=failure,
                name=name,
                )
