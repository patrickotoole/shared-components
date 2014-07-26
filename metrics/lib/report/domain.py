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

def _filter(df, pred=None, metrics=None):
    df = _truncate(df, pred=pred)
    df = _sort_df(df, metrics=metrics)
    df = _convert_inf_cpa(df)
    return df

def _truncate(df, pred=None):
    """
    pred eg: &pred=campaign#b,advertiser#c,media_cost>10
    treating '#' as '=', not conflicting with func parse_params(url)
    """
    if not pred:
        return df
    regex= re.compile(r'([><|#])')
    params = [p for p in pred.split(',')]
    params = [regex.split(p) for p in params]
    for param in params:
        k, _cmp, v = param
        df = _apply_mask(df, k, _cmp, v)
    return df

def _apply_mask(df, k, _cmp, v):
    v = float(v) if _cmp in '><' else v
    mask = (df[k] > v if _cmp == '>' else
            df[k] < v if _cmp == '<' else
            df[k] == v)
    df = df[mask]
    return df

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
    def get_report(self, *args, **kwargs):
        if not kwargs.get('group'):
            kwargs['group'] = DOMAIN
        return super(ReportDomain, self).get_report(*args, **kwargs)

    def _filter(self, df, *args, **kwargs):
        return _filter(df, *args, **kwargs)

    def _get_timedelta(self, lookback):
        return timedelta(days=lookback)

    def _get_form_helper(self, group):
        return (DOMAIN_JSON_FORM if group == 'site_domain' else
                ADVERTISER_DOMAIN_JSON_FORM if group == 'advertiser,domain' else
                ADVERTISER_DOMAIN_CAMPAIGN_JSON_FORM)
