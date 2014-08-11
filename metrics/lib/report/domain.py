"""
report the least effective campins/advertiser/domain etc.
"""

import re
import pandas as pd
from datetime import timedelta

from lib.report.base import ReportBase
from lib.report.utils.constants import *
from lib.report.request_json_forms import *

import os
CUR_DIR = os.path.dirname(__file__)

def _convert_inf_cpa(df):
    inf_cpas = df[df['cpa'] > MILLION]
    inf_cpas['cpa'] = CPA_INF
    non_inf_cpas = df[df['cpa'] < MILLION]
    df = pd.concat([inf_cpas, non_inf_cpas])
    return df

def _sort_df(df, metrics=WORST):
    """
    given pandas frame, sort them by cpa or media cost if there is no convertions.
    """
    df['convs'] = df[PC_CONVS] + df[PV_CONVS]
    df['cpa'] = df[MEDIA_COST] / (df['convs'] + DAMPING_POINT)
    df_no_convs = df[df['convs'] == 0]
    df_have_convs = df[df['convs'] != 0]

    if metrics == WORST:
        df_no_convs = df_no_convs.sort('media_cost', ascending=False)
        df_have_convs = df_have_convs.sort('cpa', ascending=False)
        df = pd.concat([df_no_convs, df_have_convs])
        df = df.reset_index(drop=True)
    else:
        #sort by cost/revenue for now
        df[COST_EFFICIENCY] = df[MEDIA_COST] / df[BOOKED_REV]
        df = df[df[BOOKED_REV] > 0]
        df = df.sort(COST_EFFICIENCY)
    return df


class ReportDomain(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'domain'
        self._table_name = 'domain_reporting'
        super(ReportDomain, self).__init__(*args, **kwargs)

    def get_report(self, *args, **kwargs):
        if not kwargs.get('group'):
            kwargs['group'] = DOMAIN
        return super(ReportDomain, self).get_report(*args, **kwargs)

    def _filter_helper(self, df, pred=None, metrics=None):
        df = _sort_df(df, metrics=metrics)
        df = _convert_inf_cpa(df)
        return df


    def _get_form_helper(self, group):
        return (DOMAIN_JSON_FORM if group == 'site_domain' else
                ADVERTISER_DOMAIN_JSON_FORM if group == 'advertiser,domain' else
                ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM)
