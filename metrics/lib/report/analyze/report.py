"""
`analyze` functions to filter or sort dataframes that is pulled back by reports
into data we wanted.
"""

import re
import logging
from datetime import timedelta

import pandas as pd

from lib.report.utils.utils import convert_datetime
from lib.report.utils.utils import memo
from lib.report.reportutils import get_or_create_console
from lib.report.utils.constants import ROUND

from lib.report.utils.constants import (
        PC_CONVS, PV_CONVS, MEDIA_COST, DAMPING_POINT, WORST,
        COST_EFFICIENCY, BOOKED_REV, MILLION, CPA_INF, GOOGLE_ADX,
        POST_CLICK, PC_EXPIRE, PV_EXPIRE, IMPS,
        )

FLOAT_REGEX = re.compile(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?')
ID_REGEX = re.compile(r'.*?\((\d+)\)')


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

def _modify_domain_columns(df):
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
    return df

def _filter_domain(df):
    undisclosed = df['domain'] == 'Undisclosed'
    none = df['domain'] == '---'
    df = df.drop(df.index[undisclosed | none])
    df['ctr'] = df['ctr'].map(lambda x: float(FLOAT_REGEX.search(x).group()))
    return df

def analyze_domain(df, metrics=None):
    df = _modify_domain_columns(df)
    df = _filter_domain(df)
    df = _sort_by_worst(df) if metrics == WORST else _sort_by_best(df)
    return df

def analyze_datapulling(df, **kwargs):
    df = df.rename(columns=dict(hour='date', advertiser_id='external_advertiser_id'))
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
    adx_res = adx_res.xs(GOOGLE_ADX, level="seller_member").reset_index()

    all_res = all_grouped[to_sum].sum()
    to_return = all_res.reset_index()
    to_return['adx_spend'] = adx_res['media_cost']
    to_return = to_return.fillna(0)
    return to_return

def analyze_conversions(df, **kwargs):
    def _is_valid(row):
        pid = row['pixel_id']
        window_hours = _get_pc_or_pv_hour(int(pid))
        window_hours = timedelta(window_hours.get('pc') if row['pc'] else
                                 window_hours.get('pv'))
        conversion_time = convert_datetime(row['conversion_time'])
        imp_time = convert_datetime(row['imp_time'])
        row['is_valid'] = imp_time + window_hours <= conversion_time
        return row

    cols = {'advertiser_id': 'external_advertiser_id',
            'datetime': 'conversion_time'}
    df = df.rename(columns=cols)
    to_drop = ['post_click_or_post_view_conv',
               'external_data',
               ]
    df['pc'] = df['post_click_or_post_view_conv'] == POST_CLICK
    df['is_valid'] = 0
    df = df.drop(to_drop, axis=1)
    df = df.apply(_is_valid, axis=1)
    return df


def _get_pc_or_pv_hour(pid):
    dict_ = _get_pc_or_pv_hours()
    return dict_.get(pid)

@memo
def _get_pc_or_pv_hours():
    def _to_hour(mins):
        return mins / 60.
    pixels = get_pixels()
    return dict((p.get('id'), dict(pc=_to_hour(p.get(PC_EXPIRE)),
                                   pv=_to_hour(p.get(PV_EXPIRE)))
                 ) for p in pixels)
@memo
def get_pixels():
    console = get_or_create_console()
    logging.info("getting pixel ids")
    res = console.get('/pixel')
    pixels = res.json.get("response").get("pixels")
    return pixels

def analyze_segment(df, metrics=None):
    df = df.rename(columns={'day': 'date_time'})
    df['date_time'] = df['date_time'].map(lambda x: convert_datetime(x))
    return df

"""
Other utils helpers
"""

def transform_(df):
    def _helper(x):
        if isinstance(x, int):
            return x
        if isinstance(x, float):
            x = round(x, ROUND)
            return x
        m = ID_REGEX.search(x)
        return int(m.group(1)) if m else x
    df = df.applymap(_helper)
    return df

def apply_filter(df, pred=None):
    """
    command_line eg: --pred=campaign=boboba,advertiser=googleadx,media_cost>10
    url eg: &pred=campaign#b,advertiser#c,media_cost>10
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
