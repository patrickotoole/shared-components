import logging

from lib.report.work.base import BaseWorker
from lib.pandas_sql import s as _sql
from lib.report.utils.sqlutils import get_report_names
from lib.report.utils.reportutils import get_db
from lib.report.utils.reportutils import get_report_obj
from lib.report.event.report import accounting
from lib.report.utils.reportutils import corret_insert

def _is_empty(df):
    """
    @param df: DataFrame
    @return: bool
    """
    return len(df.columns) == 0

class ReportError(ValueError):
    pass

class ReportWorker(BaseWorker):
    def __init__(self, name=None, con=None, act=True, **kwargs):
        self._name = name
        self._con = con
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
        """
        @return: bool | True if job succeed, False otherwise
        """
        obj = get_report_obj(self._name, db=self._con)
        report_f = obj.get_report
        try:
            df = report_f(**self._kwargs)
        except Exception as e:
            logging.warn(e)
            return False

        if _is_empty(df):
            logging.info("Empty dataframe, not writing to database")
            return False

        if self._act:
            table_name = obj.table_name
            keys = obj.unique_table_key
            con = self._con
            created = self.insert_reports(df,
                    con=con,
                    table_name=table_name,
                    key=keys,
                    )
            if created:
                if not corret_insert(con, df, table_name):
                    logging.warn("record didn't match up when inserting table: %s." % table_name)
                    return False
                return True

        return False

    def insert_reports(self, df, con=None, table_name=None, key=None):
        cols = df.columns.tolist()
        logging.info("inserting into table: %s, cols: %s" % (table_name, cols))
        _sql._write_mysql(df, table_name, cols, con.cursor(), key=key)
        con.commit()
        return True
