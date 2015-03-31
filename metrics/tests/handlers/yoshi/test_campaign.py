from tornado.testing import AsyncHTTPTestCase 
from tornado.web import  Application, RequestHandler 
import unittest
import mock
import mocks
import ujson
from link import lnk

import FIXTURES


import handlers.campaign as campaign

class CampaignTest(AsyncHTTPTestCase):

    def get_app(self):
        self.db = lnk.dbs.test
        self.db.execute(FIXTURES.CREATE_BUCKET_TABLE)

        self.mock_api = mocks.API

        campaign.YoshiCampaignHandler.current_advertiser = 1
        campaign.YoshiCampaignHandler.current_user = 1

        self.app = Application([
            ('/', campaign.YoshiCampaignHandler, dict(db=self.db, api=self.mock_api)),
            ('/(.*?)', campaign.YoshiCampaignHandler, dict(db=self.db, api=self.mock_api)) 
          ], cookie_secret="rickotoole"
        )

        return self.app


    def tearDown(self):
        self.db.execute("DROP TABLE test.campaign_bucket")

    @mock.patch.object(campaign.YoshiCampaignHandler, 'get_line_item_id', autospec=True)
    def test_get_campaigns(self, mock_get_line_item):
        mock_get_line_item.return_value = 1
        response = self.fetch("/?format=json", method="GET").body

        self.assertEqual(len(ujson.loads(response)), 1)
        self.assertEqual(
            set(ujson.loads(response)[0].keys()), 
            set([u'id',u'name',u'base_bid',u'daily_budget',u'state',u'creatives'])
        ) 

        response = self.fetch("/?format=json&show_deleted=1", method="GET").body

        self.assertEqual(len(ujson.loads(response)), 2)
        self.assertEqual(
            set(ujson.loads(response)[0].keys()), 
            set([u'id',u'name',u'base_bid',u'daily_budget',u'state',u'creatives'])
        )


    #@mock.patch.object(campaign.YoshiCampaignHandler, 'defer_modify_campaign', autospec=True) 
    def test_update_campaign(self):#, mock_modified_campaign):
        #mock_modified_campaign.side_effect = lambda s, aid, cid, c: dict(c.items() + [("aid",aid), ("cid",cid)])
        
        response = self.fetch("/?id=1&format=json", method="PUT",body='{"campaign":{"a":"b"}}').body
        self.assertEqual(ujson.dumps([{"campaign":{"a":"b","advertiser_id":"1","id":"1"}}]),response)

    @mock.patch.object(campaign.YoshiCampaignHandler, 'current_user', autospec=True)  
    @mock.patch.object(campaign.YoshiCampaignHandler, 'get_line_item_id', autospec=True) 
    @mock.patch.object(campaign.YoshiCampaignHandler, 'set_campaign_profile_id', autospec=True)  
    @mock.patch.object(campaign.YoshiCampaignHandler, 'create_admin_profile', autospec=True) 
    @mock.patch.object(campaign.YoshiCampaignHandler, 'create_admin_campaign', autospec=True) 
    def test_post_admin_campaign(self, campaign, profile, set_profile, line_item, current_user): 

        CID = 100
        PID = 101

        line_item.return_value = 1
        campaign.side_effect = lambda s, lid, aid, n, bp, cr: {"id":CID,"advertiser_id":aid,"name":n, "creatives":cr}
        profile.side_effect = lambda s, aid, cid, p: {"id":PID, "advertiser_id":aid, "campaign_id":cid}
        set_profile.side_effect = lambda s, aid, cid, pid: {"id":cid, "profile_id":pid, "advertiser_id":aid}

        to_post = { 
            "campaign":{
                "creatives": []
            },
            "profile":{
                "domain_targets": [{"domain":"test_domain"}]
            },
            "details":{
                "sizes": ["300x250"],
                "username": "a_admin"
            }
        }

        expect = {
            u"profile": {u"advertiser_id":1,u"id":PID,u"campaign_id":CID},
            u"campaign": {u"advertiser_id":1,u"profile_id":PID,u"id":CID}
        }
        
        response = self.fetch("/?id=1&format=json", method="POST",body=ujson.dumps(to_post)).body
        df = self.db.select_dataframe("SELECT * from campaign_bucket")

        self.assertEqual(expect,ujson.loads(response))
        self.assertEqual(len(df),0)

    @mock.patch.object(campaign.YoshiCampaignHandler, 'get_line_item_id', autospec=True) 
    @mock.patch.object(campaign.YoshiCampaignHandler, 'set_campaign_profile_id', autospec=True)  
    @mock.patch.object(campaign.YoshiCampaignHandler, 'create_profile', autospec=True) 
    @mock.patch.object(campaign.YoshiCampaignHandler, 'create_campaign', autospec=True) 
    def test_post_campaign(self, campaign, profile, set_profile, line_item):

        CID = 100
        PID = 101

        line_item.return_value = 1
        campaign.side_effect = lambda s, lid, aid, n, bp, cr: {"id":CID,"advertiser_id":aid,"name":n, "creatives":cr}
        profile.side_effect = lambda s, aid, cid, p: {"id":PID, "advertiser_id":aid, "campaign_id":cid}
        set_profile.side_effect = lambda s, aid, cid, pid: {"id":cid, "profile_id":pid, "advertiser_id":aid}

        to_post = { 
            "campaign":{
                "creatives": []
            },
            "profile":{
                "domain_targets": [{"domain":"test_domain"}]
            },
            "details":{
                "sizes": ["300x250"] 
            }
        }

        expect = {
            u"profile": {u"advertiser_id":1,u"id":PID,u"campaign_id":CID},
            u"campaign": {u"advertiser_id":1,u"profile_id":PID,u"id":CID}
        }
        
        response = self.fetch("/?id=1&format=json", method="POST",body=ujson.dumps(to_post)).body
        df = self.db.select_dataframe("SELECT * from campaign_bucket")
        bucket_name = df.ix[0,"bucket_name"]
        cid = df.ix[0,"campaign_id"] 

        self.assertEqual(expect,ujson.loads(response))
        self.assertEqual("Yoshi | test_domain | 300x250",bucket_name)
        self.assertEqual(CID,cid)

