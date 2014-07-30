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
from datetime import timedelta
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
    df['date'] = pd.to_datetime(df['hour'])
    df['external_advertiser_id'] = df['advertiser_id']
    df = df.drop(['hour', 'advertiser_id'], axis=1)
    grouped = df.groupby(['date',
                          'external_advertiser_id',
                          'line_item_id',
                          'campaign_id',
                          'creative_id',
                          'seller_member',
                          ])
    grouped2 = df.groupby(['date',
                           'external_advertiser_id',
                           'line_item_id',
                           'campaign_id',
                           'creative_id',
                          ])
    res = grouped[['imps', 'clicks', 'media_cost']].sum()
    res2 = grouped2[['imps', 'clicks', 'media_cost']].sum()
    res = res.xs(GOOGLE_ADX, level="seller_member").reset_index()
    return res
