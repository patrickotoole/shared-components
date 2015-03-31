from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import ujson
from link import lnk

import FIXTURES


import handlers.campaign as campaign

class CampaignTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test

        self.mock_api = mock.MagicMock()

        campaign.YoshiCampaignHandler.current_advertiser = 1
        campaign.YoshiCampaignHandler.current_user = 1

        self.app = Application([
            ('/', campaign.YoshiCampaignHandler, dict(reporting_db=self.db, api=self.mock_api)),
            ('/(.*?)', campaign.YoshiCampaignHandler, dict(reporting_db=self.db, api=self.mock_api)) 
          ], cookie_secret="rickotoole"
        )


        return self.app

    def tearDown(self):
        pass

    @mock.patch.object(campaign.YoshiCampaignHandler, 'defer_get_campaigns', autospec=True) 
    @mock.patch.object(campaign.YoshiCampaignHandler, 'get_line_item_id', autospec=True)
    def test_get_campaigns(self, mock_get_line_item,mock_get_campaigns):
        mock_get_line_item.return_value = 1
        mock_get_campaigns.return_value = FIXTURES.CAMPAIGNS_MOCKED
        
        response = self.fetch("/?format=json", method="GET").body

        self.assertEqual(len(ujson.loads(response)), 2)
        self.assertEqual(
            set(ujson.loads(response)[0].keys()), 
            set([u'id',u'name',u'base_bid',u'daily_budget',u'state',u'creatives'])
        ) 
