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

from lib.report.utils.constants import (
        PC_CONVS, PV_CONVS, MEDIA_COST, DAMPING_POINT, WORST,
        COST_EFFICIENCY, BOOKED_REV, MILLION, CPA_INF, GOOGLE_ADX,
        POST_CLICK, PC_EXPIRE, PV_EXPIRE,
        )

ID_REGEX = re.compile(r'.*?\((\d+)\)')

def analyze_domain(df, metrics=None):
    def _sort_df(df, metrics=None):
        """
        given pandas frame, sort them by cpa or media cost if there is no convertions.
        """
        df['convs'] = df[PC_CONVS] + df[PV_CONVS]
        df['cpa'] = df[MEDIA_COST] / (df['convs'] + DAMPING_POINT)
        df['profit'] = df[BOOKED_REV] - df[MEDIA_COST]
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

    def _convert_inf_cpa(df):
        inf_cpas = df[df['cpa'] > MILLION]
        inf_cpas['cpa'] = CPA_INF
        non_inf_cpas = df[df['cpa'] < MILLION]
        df = pd.concat([inf_cpas, non_inf_cpas])
        return df

    undisclosed = df['site_domain'] == 'Undisclosed'
    none = df['site_domain'] == '---'
    df = df.drop(df.index[undisclosed | none])

    df = _sort_df(df, metrics=metrics)
    df = _convert_inf_cpa(df)
    to_rename = dict(booked_revenue='rev',
                     post_click_convs='pc_convs',
                     click_thru_pct='ctr',
                     media_cost='mc',
                     post_view_convs='pv_convs',
                     )
    df = df.rename(columns=to_rename)
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
    return to_return

def analyze_conversions(df, **kwargs):
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

def _is_valid(row):
    pid = row['pixel_id']
    window_hours = _get_pc_or_pv_hour(int(pid))
    window_hours = timedelta(window_hours.get('pc') if row['pc'] else
                             window_hours.get('pv'))
    conversion_time = convert_datetime(row['conversion_time'])
    imp_time = convert_datetime(row['imp_time'])
    row['is_valid'] = imp_time + window_hours <= conversion_time
    return row

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


"""
Other utils helpers
"""

def filter_pred(df, pred=None):
    """
    command_line eg: --pred=campaign=boboba,advertiser=googleadx,media_cost>10
    url eg: &pred=campaign#b,advertiser#c,media_cost>10
    treating '#' as '=', not conflicting with func parse_params(url)
    """
    def _helper(x):
        if isinstance(x, int):
            return x
        if isinstance(x, float):
            x = round(x, 3)
            return x
        m = ID_REGEX.search(x)
        return int(m.group(1)) if m else x

    df = df.applymap(_helper)
    if not pred:
        return df
    regex= re.compile(r'([><|#=])')
    params = [p for p in pred.split(',')]
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
