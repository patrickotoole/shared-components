"""
`analyze` functions to filter or sort dataframes that is pulled back by reports
into data we wanted.
"""

import re
import logging
from datetime import timedelta

import pandas as pd
from link import lnk

from lib.report.utils.utils import parse_datetime
from lib.report.utils.utils import memo
from lib.report.utils.apiutils import get_or_create_console
from lib.report.utils.constants import ROUND
from lib.report.utils.constants import Analyze

from lib.report.utils.constants import (
    PC_CONVS, PV_CONVS, MEDIA_COST, DAMPING_POINT, WORST,
    COST_EFFICIENCY, BOOKED_REV, MILLION, CPA_INF, GOOGLE_ADX,
    POST_CLICK, PC_EXPIRE, PV_EXPIRE, IMPS,
    DEFAULT_DB,
)

FLOAT_REGEX = re.compile(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?')

"Babaubar (102934)"
ID_REGEX = re.compile(r'.*?\((\d+)\)')

def get_analyze_obj(name):
    if not name in Analyze:
        raise ValueError("Analyze object not found")

    return (AnalyzeDomain if name == Analyze.domain else
            AnalyzeDataPulling if name == Analyze.datapulling else
            AnalyzeConversions if name == Analyze.conversions else
            AnalyzeSegment if name == Analyze.segment else
            AnalyzeGeo)


class AnalyzeBase(object):
    def __init__(self, pred=None, metrics=None):
        self.pred = pred
        self.metrics = metrics or 'worst'

    def analyze(self, df):
        df = self._modify(df)
        df = filter_and_transform(df, self.pred)
        df = self._sort(df)
        df = df.reset_index(drop=True)
        return df

    def _modify(self, *args, **kwargs):
        raise NotImplementedError

    def _sort(self, df):
        return df

#-------------------domain----------------------------------------------------------

class AnalyzeDomain(AnalyzeBase):
    def _modify(self, df):
        df['convs'] = df[PC_CONVS] + df[PV_CONVS]
        df['profit'] = df[BOOKED_REV] - df[MEDIA_COST]
        to_rename = dict(booked_revenue='rev',
                         post_click_convs='pc_convs',
                         click_thru_pct='ctr',
                         media_cost='mc',
                         site_domain='domain',
                         post_view_convs='pv_convs',
                         )
        df = df.rename(columns=to_rename)
        undisclosed = df['domain'] == 'Undisclosed'
        none = df['domain'] == '---'
        df = df.drop(df.index[undisclosed | none])
        df['ctr'] = df['ctr'].map(lambda x:
                round(float(FLOAT_REGEX.search(x).group()), ROUND))
        return df

    def _sort(self, df):
        f = _sort_by_best if self.metrics == 'best' else _sort_by_worst
        return f(df)

def _sort_by_worst(df):
    df = df.sort(IMPS, ascending=False)
    return df

def _sort_by_best(df):
    #sort by cost/revenue for now
    df = df[df['convs'] > 0]
    df[COST_EFFICIENCY] = df['mc'] / df['rev']
    df = df.sort(['convs', COST_EFFICIENCY], ascending=[False, True])
    df = df.drop([COST_EFFICIENCY], axis=1)
    return df

#-------------------datapulling-------------------------------------------------------

class AnalyzeDataPulling(AnalyzeBase):
    def _modify(self, df):
        df = df.rename(columns=dict(
                hour='date',
                advertiser_id='external_advertiser_id',
                ))
        df['date'] = pd.to_datetime(df['date'])
        to_group_all = ['date',
                    'external_advertiser_id',
                    'line_item_id',
                    'campaign_id',
                    'creative_id',
                    ]
        to_group_adx = to_group_all + ['seller_member']
        adx_grouped = df.groupby(to_group_adx)
        all_grouped = df.groupby(to_group_all)

        to_sum = ['imps', 'clicks', 'media_cost']
        adx_res = adx_grouped[to_sum].sum()
        all_res = all_grouped[to_sum].sum()
        try:
            adx_res = adx_res.xs(GOOGLE_ADX, level="seller_member")
        except KeyError:
            all_res = all_res.reset_index()
            all_res['adx_spend'] = 0
            return all_res

        joined = all_res.join(adx_res, rsuffix='_adx')
        joined = joined.reset_index()
        joined = joined.rename(columns={'media_cost_adx': 'adx_spend'})
        cols = filter(lambda x: not '_adx' in x, list(joined.columns))
        joined = joined[cols].reset_index()
        joined = joined.fillna(0)
        joined = joined.drop('index', 1)

        return joined

#-------------------segment------------------------------------------------------------
class AnalyzeSegment(AnalyzeBase):
    def _modify(self, df):
        df = df.rename(columns={'day': 'date_time'})
        df['date_time'] = df['date_time'].map(lambda x: parse_datetime(x))
        return df

#-------------------conversions---------------------------------------------------------
class AnalyzeConversions(AnalyzeBase):
    def _modify(self, df):
        df = df.rename(columns=dict(
                advertiser_id='external_advertiser_id',
                datetime='conversion_time',
                ))
        df = _filter_advertiser(df)
        to_drop = ['post_click_or_post_view_conv',
                   'external_data',
                   ]
        df['pc'] = df['post_click_or_post_view_conv'] == POST_CLICK
        df['is_valid'] = 0
        df = df.drop(to_drop, axis=1)
        df = df.apply(_is_valid, axis=1)
        return df

def _filter_advertiser(df):
    adv_df = DEFAULT_DB().select_dataframe('select * from advertiser')
    adv_ids = adv_df.external_advertiser_id.unique().tolist()
    return df[df.external_advertiser_id.isin(adv_ids)]

def _is_valid(row):
    """
    @param row: Datafram rows
    @return: bool. whether the conversion happened within expire windows.
    """
    pid = int(row['pixel_id'])
    def _get_window_hours():
        window_hours = _get_pc_or_pv_hour(int(pid))
        return timedelta(hours=(window_hours.get('pc') if row['pc']
                                else window_hours.get('pv')))
    window_hours = _get_window_hours()
    conversion_time = parse_datetime(row['conversion_time'])
    imp_time = parse_datetime(row['imp_time'])
    row['is_valid'] = imp_time >= conversion_time - window_hours
    return row

def _get_pc_or_pv_hour(pid):
    dict_ = _get_pc_or_pv_hours()
    return dict_.get(pid)

@memo
def _get_pc_or_pv_hours():
    """
    @return: dict(int(pixelid), dict(pc_exp, pv_exp))
    """
    df = DEFAULT_DB().select_dataframe("select * from advertiser_pixel");
    return { d['pixel_id']: { 'pc': d['pc_window_hours'], 'pv':d['pv_window_hours'] }
            for _, d in df.iterrows() }

#----------------------------------------------------------------------------

class AnalyzeGeo(AnalyzeBase):
    def _modify(self, df):
        to_rename = dict(
            advertiser='external_advertiser_id',
            day='date',
            geo_dma='dma',
            geo_region='region',
            booked_revenue='revenue',
            click_thru_pct='ctr',
            total_convs='convs',
        )
        df = df.rename(columns=to_rename)
        df['ctr'] = df['ctr'].map(lambda x:
                round(float(FLOAT_REGEX.search(x).group()), ROUND))
        return df

#----------------------------------------------------------------------------
"""
Other utils helpers
"""

def filter_and_transform(df, pred=None):
    return _transform(apply_filter(df, pred))

def _transform(df):
    """
    Round float fields
    Make id fields int:
     str(GoogleAdx (192)) -> Int(192)
    """
    def _helper(x):
        if isinstance(x, int):
            return x
        if isinstance(x, float):
            x = round(x, ROUND)
            return x
        if isinstance(x, str):
            m = ID_REGEX.search(x)
            return int(m.group(1)) if m else x
        return x
    if df.empty:
        return df
    df = df.applymap(_helper)
    return df

def apply_filter(df, pred=None):
    """
    command_line eg: --pred=campaign=boboba,advertiser=googleadx,media_cost>10
    url          eg: &pred=campaign#b,advertiser#c,media_cost>10
        treating '#' as '=', not conflicting with func parse_params(url)
    """
    if not pred:
        return df
    regex = re.compile(r'\s*([><|#=])\s*')
    params = re.split(r'[,&]', pred)
    params = [regex.split(p) for p in params]
    for param in params:
        k, _cmp, v = param
        df = apply_mask(df, k, _cmp, v)
    return df

def apply_mask(df, k, _cmp, v):
    v = eval(v) if v.isdigit() else v
    mask = (df[k] > v if _cmp == '>' else
            df[k] < v if _cmp == '<' else
            df[k] == v)
    df = df[mask]
    return df
