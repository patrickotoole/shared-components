"""
report the least effective campins/advertiser/domain etc.
"""
import re

from lib.report.base import ReportBase

from lib.report.request_json_forms import DOMAIN_JSON_FORM
from lib.report.request_json_forms import ADVERTISER_DOMAIN_JSON_FORM
from lib.report.request_json_forms import ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM
from lib.report.request_json_forms import ADVERTISER_DOMAIN_LINE_ITEM_JSON_FORM

FLOAT_REGEX = re.compile(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?')

class ReportDomain(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'domain'
        self._table_name = 'domain_reporting'
        super(ReportDomain, self).__init__(*args, **kwargs)

    def get_report(self, *args, **kwargs):
        if not kwargs.get('group'):
            kwargs['group'] = 'advertiser,domain,line_item'
        return super(ReportDomain, self).get_report(*args, **kwargs)

    def _get_form_helper(self, group):
        if group == 'domain':
            return DOMAIN_JSON_FORM
        elif group == 'advertiser,domain':
            return ADVERTISER_DOMAIN_JSON_FORM
        elif group == 'advertiser,domain,campaign':
            return ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM
        elif group == 'advertiser,domain,line_item':
            return ADVERTISER_DOMAIN_LINE_ITEM_JSON_FORM
        raise ValueError("No form found for group: %s" % group)
