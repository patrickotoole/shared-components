import logging
import os
import io

import pandas as pd

from lib.report.analyze.report import get_analyze_obj
from lib.report.utils.sqlutils import get_unique_keys
from lib.report.utils.reportutils import get_path
from lib.report.utils.apiutils import get_report_id
from lib.report.utils.apiutils import get_report_url
from lib.report.utils.apiutils import get_report_resp
from lib.report.utils.reportutils import empty_frame


CUR_DIR = os.path.dirname(__file__)

def _create_csv(df, path):
    logging.info("creating csv file to path: %s" % path)
    df.to_csv(path, index=False)

class LimitError(ValueError):
    pass

class ReportBase(object):
    def __init__(self, db=None, *args, **kwargs):
        self._db_wrapper = db

    @property
    def table_name(self):
        return self._table_name

    @property
    def unique_table_key(self):
        cur = self._db_wrapper
        return get_unique_keys(cur, self._table_name)

    def get_report(self, **kwargs):
        """
        @return: DataFrame
        there is error when returning emptyFrame(no columns,no index)
        """
        dfs = self._get_report(**kwargs)
        if dfs.empty:
            return dfs
        limit = kwargs.get('limit')
        pred = kwargs.get('pred')
        metrics = kwargs.get('metrics')
        dfs = self._analyze(dfs, pred=pred, metrics=metrics)
        return dfs[:limit]

    def _get_report(self,
            group=None,
            limit=None,
            start_date=None,
            end_date=None,
            cache=False,
            path=None,
            **kwargs):
        """
        Parameters
        ---------
         group:        str
         limit:        int
         start_date:   str
         end_date:     str
         path:         str
         cache:        bool
           when True will load from cached csv file, will create tmp csv file
           if file dont exist,

        Returns
        ------
         Dataframe
        """
        dfs = None
        _should_create_csv = False
        logging.info("Getting start date: %s, end date: %s" % (start_date, end_date))
        if cache:
            path = get_path(name=self._name, group=group,
                            start_date=start_date, end_date=end_date)
        if path:
            try:
                logging.info("Getting csv from path: %s" % path)
                dfs = pd.read_csv(path)
            except IOError:
                logging.info("CSV file not exists in path: %s" % path)
                _should_create_csv = True
        if not isinstance(dfs, pd.DataFrame):
            dfs = self._get_dataframes(group=group,
                    end_date=end_date,
                    start_date=start_date,
                    limit=limit,
                    )
        if _should_create_csv and not dfs.empty:
            _create_csv(dfs, path)
        return dfs

    def _get_dataframes(self, **kwargs):
        raise NotImplementedError

    def _get_dataframe(self, advertiser_id=None, **kwargs):
        """
        @param url : str
        @return: Dataframe
        """
        _form = self._get_form(**kwargs)
        url = self._get_request_url(advertiser_id)
        try:
            resp = self._get_resp_helper(url, _form)
        except Exception as e:
            logging.warn(e)
            return empty_frame()
        df = self._resp_to_df(resp)
        return df

    def _get_form(self, group=None,
            start_date=None,
            end_date=None,
            pixel_id=None,
            **args
            ):
        _d = dict(start_date=start_date, end_date=end_date)
        if pixel_id:
            _d.update(dict(pixel_id=pixel_id))
        _form = self._get_form_helper(group)
        return _form % _d

    def _get_form_helper(self, *args, **kwargs):
        raise NotImplementedError

    def _get_resp_helper(self, url, form):
        logging.info("requesting data from url: %s" % url)
        _id = get_report_id(url, form)
        url = get_report_url(_id)
        resp = get_report_resp(url)
        return resp

    def _resp_to_df(self, resp):
        df = pd.read_csv(io.StringIO(unicode(resp)))
        return df

    def _get_request_url(self, _id=None):
        return ('/report?advertiser_id=' + _id) if _id else '/report?'

    def _analyze(self, df, pred=None, metrics=None):
        obj = get_analyze_obj(self._name)
        return obj(pred, metrics).analyze(df)
