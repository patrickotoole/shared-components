import inspect
import time
import logging
import os
import io

import pandas as pd

from lib.report.analyze import report as ANALYZERS
from lib.report.utils.apiutils import get_report_id
from lib.report.utils.apiutils import get_report_url
from lib.report.utils.apiutils import get_report_resp
from lib.report.utils.constants import SLEEP
from lib.report.utils import constants as CONSTANTS

CUR_DIR = os.path.dirname(__file__)

class ReportBase(object):
    def __init__(self, db=None,
                 start_date=None,
                 end_date=None,
                 name=None,
                 **kwargs):
        self.db = db
        self.start_date = start_date
        self.end_date = end_date
        self.name = name

    def get_reports(self, *args, **kwargs):
        if not self.require_external_advertiser_ids:
            return self._get_report(self.request_url(),
                                       self.request_json_form())
        else:
            return self._get_reports(*args, **kwargs)

    def _get_reports(*args, **kwargs):
        raise NotImplementedError()

    @property
    def analyzer(self):
        try:
            return [v for n, v in inspect.getmembers(ANALYZERS)
                    if 'analyze'+self.name == n.lower()][0]
        except IndexError:
            logging.exception("%s: analyzer not found:" % self.name)
            raise

    @staticmethod
    def _get_report(url, form):
        """
        :url: str
        :form: str(json_form_dump)
        :return: DataFrame
        """
        _id = get_report_id(url, form)
        # making sure appnexus have enough time to generate reports
        time.sleep(SLEEP)
        url = get_report_url(_id)
        resp = get_report_resp(url)
        df = pd.read_csv(io.StringIO(unicode(resp)))
        return df

    @property
    def require_external_advertiser_ids(self):
        return True

    @property
    def date_column(self):
        """
        `select * from {somecolumn} where {date_column} >= {start_date} and {date_column} < {end_date}`

        we're pulling what's just inserted from database, convert them to csv and compare with the one we pull
        from appnexus
        """
        NotImplementedError()

    def request_url(self):
        return '/report?advertiser_id='

    def request_json_form(self, **kwargs):
        d = dict(start_date=self.start_date, end_date=self.end_date)
        return self._request_json_form() % dict(d, **kwargs)

    def _request_json_form(self):
        try:
            return [v for n, v in inspect.getmembers(CONSTANTS)
                    if self.name+'_form' == n.lower()][0]
        except IndexError:
            logging.exception("request json form for %s not found:" % self.name)
            raise
