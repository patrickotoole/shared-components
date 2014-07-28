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
from lib.report.utils.constants import *
from lib.report.base import ReportBase
from lib.report.request_json_forms import DATA_PULLING_FORMS


class ReportDataPulling(ReportBase):
    def get_report(self, *args, **kwargs):
        kwargs['group'] = DATA_PULL
        return super(ReportDataPulling, self).get_report(*args, **kwargs)

    def _filter(self, df, *args, **kwargs):
        return _analyze(df)

    def _get_timedelta(self, lookback):
        return timedelta(hours=lookback)

    def _get_advertiser_ids(self):
        return ADVERTISER_IDS

    def _get_form_helper(self, *args, **kwargs):
        return DATA_PULLING_FORMS

def _analyze(df):
    df['date'] = df['hour']
    df['external_advertiser_id'] = df['advertiser_id']
    df = df.drop(['hour', 'advertiser_id'])
    grouped = df.groupby(['date',
                          'advertiser_id',
                          'line_item_id',
                          'campaign_id',
                          'creative_id',
                          'seller_member',
                          ])
    res = grouped[['imps', 'clicks', 'media_cost']].sum()
    res = res.xs(GOOGLE_ADX, level="seller_member").reset_index()
    return res
