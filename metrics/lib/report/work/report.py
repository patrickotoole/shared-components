import logging
import pandas as pd

from lib.report.work.base import BaseWorker
from lib.pandas_sql import s as _sql
from lib.report.utils.utils import local_now
from lib.report.reportutils import get_default_db
from lib.report.reportutils import get_report_obj


class ReportWorker(BaseWorker):
    def __init__(self, name, _db=None):
        self._db = _db or get_default_db()
        self._name = name

    def do_work(self, **kwargs):
        """
        @return: bool, True if successful, False otherwise
        """
        job_created_at = kwargs.get('job_created_at') or local_now()
        status = job_ended_at = None

        try:
            self._work(**kwargs)
            status = True
        except Exception:
            logging.info("report job : %s, failed" % self._name)
            status = False

        job_ended_at = local_now()
        cur = self._db.cursor()
        _create_report_events(cur,
                name=self._name,
                start=job_created_at,
                end=job_ended_at,
                status=status,
                )
        return status

    def _work(self, **kwargs):
        _obj = get_report_obj(self._name)
        df = _obj.get_report(**kwargs)
        table_name = _get_table_name(self._name)
        cur = self._db.cursor()
        col_names = df.columns.tolist()
        logging.info("inserting into table: %s, cols: %s" % (table_name, col_names))
        _sql._write_mysql(df, table_name, col_names, cur)

def _get_table_name(name):
    return ('v4_reporting' if name == 'datapulling' else
            'domain_reporting' if name == 'domain' else
            'conversion_reporting')

def _create_report_events(cur, **kwargs):
    kwargs['failure'] = kwargs['success'] = None
    if kwargs['status']:
        kwargs['success'] = kwargs['end']
    else:
        kwargs['failure'] = kwargs['end']
    df = pd.DataFrame([kwargs])
    logging.info("creating report event")
    _sql._write_mysql(df, "reportevent", df.columns.tolist(), cur)
