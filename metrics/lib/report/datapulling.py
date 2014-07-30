"""
cron script runs hourly to pull following data
    hour
    line_item
    campaign
    creative
    advertiser
    - Clicks
    - Imps
    - Media Cost
    adx_spend (new_field, compare to v3_reporting)

writing to database v4_reporting
"""
import pandas as pd
from lib.report.utils.constants import *
from lib.report.base import ReportBase
from lib.report.request_json_forms import DATA_PULLING_FORMS


class ReportDataPulling(ReportBase):
    def __init__(self, *args, **kwargs):
        self._name = 'datapulling'
        self._table_name = 'v4_reporting'
        super(ReportDataPulling, self).__init__(*args, **kwargs)

    def _filter_helper(self, df, *args, **kwargs):
        return _analyze(df)

    def _get_advertiser_ids(self):
        return ADVERTISER_IDS

    def _get_form_helper(self, *args, **kwargs):
        return DATA_PULLING_FORMS

    def _get_unique_table_key(self):
        return ['date',
                'external_advertiser_id',
                'line_item_id',
                'campaign_id',
                'creative_id',
                ]

def _analyze(df):
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
