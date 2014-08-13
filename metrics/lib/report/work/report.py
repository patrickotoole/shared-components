import logging

from lib.report.work.base import BaseWorker
from lib.pandas_sql import s as _sql
from lib.report.utils.sqlutils import get_report_names
from lib.report.utils.sqlutils import get_unique_keys
from lib.report.utils.reportutils import get_db
from lib.report.utils.reportutils import get_report_obj
from lib.report.event.report import accounting


class ReportError(ValueError):
    pass

class ReportWorker(BaseWorker):
    def __init__(self, name=None, con=None, act=None, **kwargs):
        self._name = name
        self._con = con or get_db()
        self._act = act
        self._kwargs = kwargs

    def do_work(self, **kwargs):
        report_names = get_report_names(self.con)
        logging.info("job report starting: %s" % report_names)
        for name in report_names:
            try:
                self._work(name, con=self.con, act=True, **kwargs)
            except Exception:
                logging.info("job: %s failed" % name)
        logging.info("job report ended for: %s" % report_names)
        return

    @accounting
    def _work(self):
        _obj = get_report_obj(self._name)
        report_f = _obj.get_report
        try:
            df = report_f(**self._kwargs)
        except Exception as e:
            logging.warn(e)
            raise ReportError
        if self._act:
            table_name = _obj._table_name
            created = self.insert_reports(df,
                    con=self._con,
                    table_name=table_name,
                    key=get_unique_keys(self._con, table_name),
                    )
            if created:
                logging.info("successfully created report for %s" % self._name)

    def insert_reports(self, df, con=None, table_name=None, key=None):
        cols = df.columns.tolist()
        logging.info("inserting into table: %s, cols: %s" % (table_name, cols))
        _sql._write_mysql(df, table_name, cols, con.cursor(), key=key)
        con.commit()
        return True
