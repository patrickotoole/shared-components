
from lib.report.reports.base import ReportBase

from lib.report.utils.constants import SEGMENT_FORM


class ReportSegment(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'segment'
        self._table_name = 'segment_reporting'
        super(ReportSegment, self).__init__(*args, **kwargs)

    def _get_form_helper(self, *args, **kwargs):
        return SEGMENT_FORM

    def _get_dataframes(self, **kwargs):
        return self._get_dataframe(**kwargs)