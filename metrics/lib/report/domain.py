"""
report the least effective campins/advertiser/domain etc.
"""
from lib.report.base import ReportBase
from lib.report.utils.constants import DOMAIN
from lib.report.analyze.report import analyze_domain

from lib.report.request_json_forms import DOMAIN_JSON_FORM
from lib.report.request_json_forms import ADVERTISER_DOMAIN_JSON_FORM
from lib.report.request_json_forms import ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM


class ReportDomain(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'domain'
        self._table_name = 'domain_reporting'
        super(ReportDomain, self).__init__(*args, **kwargs)

    def get_report(self, *args, **kwargs):
        if not kwargs.get('group'):
            kwargs['group'] = DOMAIN
        return super(ReportDomain, self).get_report(*args, **kwargs)

    def _analyze_helper(self, df, pred=None, metrics=None):
        return analyze_domain(df, metrics=metrics)

    def _get_form_helper(self, group):
        return (DOMAIN_JSON_FORM if group == 'site_domain' else
                ADVERTISER_DOMAIN_JSON_FORM if group == 'advertiser,domain' else
                ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM)
