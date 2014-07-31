import logging

from lib.report.work.base import BaseWorker
from lib.pandas_sql import s as _sql
from lib.report.utils.utils import local_now
from lib.report.utils.utils import get_dates
from lib.report.reportutils import get_db
from lib.report.reportutils import get_report_obj
from lib.report.event.report import EventReport

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

        job_ended_at = local_now()
        start_date, end_date = get_dates(end_date=kwargs['end_date'],
                                         lookback=kwargs['lookback'])
        EventReport(event_name=self._name,
                    db_wrapper=self._db,
                    job_created_at=job_created_at,
                    job_ended_at=job_ended_at,
                    start_date=start_date,
                    end_date=end_date,
                    status=status,
                    table_name='event_report',
                    ).create_event()
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
