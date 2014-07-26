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
    adx_spend
"""
from datetime import timedelta
from lib.report.utils.constants import *
from lib.report.base import ReportBase


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

def _analyze(df):
    grouped = df.groupby(['hour',
                          'advertiser_id',
                          'line_item_id',
                          'campaign_id',
                          'creative_id',
                          'seller_member',
                          ])
    res = grouped[['imps', 'clicks', 'media_cost']].sum()
    res = res.xs(GOOGLE_ADX, level="seller_member").reset_index()
    return res
