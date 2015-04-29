import pandas as pd
import unittest
import sys
sys.path.append("../../")
from placement_opt import PlacementAction

import mock
import ujson
from mock import MagicMock

## Fixtures

EX_CAMPAIGN = 7442204

GOOD_PROFILE = u'{"response":{"status":"OK","count":1,"start_element":0,"num_elements":100,"profile":{"id":21852734,"code":null,"description":null,"country_action":"include","region_action":"exclude","city_action":"exclude","browser_action":"exclude","use_inventory_attribute_targets":false,"last_modified":"2015-03-31 20:00:03","daypart_timezone":null,"dma_action":"exclude","domain_action":"include","domain_list_action":"exclude","inventory_action":"exclude","language_action":"exclude","segment_boolean_operator":"or","min_session_imps":null,"session_freq_type":"platform","carrier_action":"exclude","supply_type_action":"include","device_type_action":"include","screen_size_action":"exclude","device_model_action":"exclude","location_target_radius":null,"location_target_latitude":null,"location_target_longitude":null,"querystring_action":"exclude","querystring_boolean_operator":"and","is_expired":false,"non_audited_url_action":"include","optimization_zone_action":"exclude","advertiser_id":453991,"publisher_id":null,"max_session_imps":null,"max_day_imps":5,"max_lifetime_imps":50,"max_page_imps":null,"min_minutes_per_imp":null,"venue_action":"exclude","operating_system_action":"exclude","require_cookie_for_freq_cap":true,"trust":"seller","allow_unaudited":true,"is_template":false,"created_on":"2015-03-20 15:14:54","operating_system_family_action":"exclude","use_operating_system_extended_targeting":true,"mobile_app_instance_action_include":false,"mobile_app_instance_list_action_include":false,"certified_supply":false,"user_group_targets":null,"country_targets":[{"country":"US","country_id":233,"name":"United States"}],"region_targets":null,"city_targets":null,"inv_class_targets":null,"inventory_source_targets":null,"inventory_attribute_targets":null,"age_targets":null,"daypart_targets":null,"browser_targets":null,"dma_targets":null,"domain_targets":[{"profile_id":21852734,"domain":"couponsandfreebiesmom.com"}],"domain_list_targets":null,"language_targets":null,"size_targets":null,"zip_targets":null,"member_targets":null,"video_targets":null,"segment_group_targets":[{"boolean_operator":"and","segments":[{"id":2497907,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - Purchase Conversion Pixel","deleted":false,"other_in_list":null},{"id":2497911,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - All Pages Segment","deleted":false,"other_in_list":null},{"id":2497912,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - Logged In Segment","deleted":false,"other_in_list":null}]}],"carrier_targets":null,"supply_type_targets":["web"],"device_type_targets":["other devices"],"screen_size_targets":null,"device_model_targets":null,"querystring_targets":null,"gender_targets":null,"intended_audience_targets":null,"inventory_group_targets":null,"inventory_network_resold_targets":null,"operating_system_targets":null,"operating_system_family_targets":null,"position_targets":{"allow_unknown":true,"positions":null},"site_targets":null,"venue_targets":null,"operating_system_extended_targets":null,"mobile_app_instance_targets":null,"mobile_app_instance_list_targets":null,"optimization_zone_targets":null,"content_category_targets":null,"deal_targets":null,"placement_targets":null,"platform_content_category_targets":null,"platform_placement_targets":[{"id":3233696,"action":"include","deleted":false}],"platform_publisher_targets":null,"publisher_targets":null,"segment_targets":null,"exelate_targets":null,"ip_range_list_targets":null},"dbg_info":{"instance":"64.bm-hbapi.prod.nym2","slave_hit":true,"db":"mysql-api-slave-04.prod.nym2.adnxs.net","reads":2,"read_limit":100,"read_limit_seconds":60,"writes":0,"write_limit":60,"write_limit_seconds":60,"awesomesauce_cache_used":false,"count_cache_used":true,"warnings":[],"time":137.35795021057,"start_microtime":1428957526.4538,"version":"1.15.466","slave_lag":0,"member_last_modified_age":998,"output_term":"profile"}}}\n'

EX_PLACEMENT_ID_1 = 11988

EX_PLACEMENT_ID_2 = 122

PLACEMENT_TARGET_1 = {'id': EX_PLACEMENT_ID_1, 'action':'include', 'deleted': False}

PLACEMENT_TARGET_1_BAD = {'id': EX_PLACEMENT_ID_1, 'actrion':'exclude', 'deleted': False}

PLACEMENT_TARGET_2 = {'id': EX_PLACEMENT_ID_2, 'action':'include', 'deleted': False}

TO_EXCLUDE = ""

BAD_OPT_RESPONSE = u'{"status":"error","response":"current field value in AppNexus does not match field_old_value. 1100 != 100"}'

GOOD_OPT_RESPONSE = u'{"status":"ok","response":[{"rule_group_id":56,"field_new_value":"1100","profile_id":26587193,"campaign_id":7983035,"object_modified":"campaign","last_modified":1428965443,"value_group_id":2517,"field_old_value":"1100","field_name":"daily_budget"}]}'


from link import lnk

class PlacementActionTest(unittest.TestCase):
    
    def setUp(self):
        
        lnk.api = mock.MagicMock()
        lnk.rockerbox = mock.MagicMock()
        self.d = PlacementAction({}, EX_CAMPAIGN)

    def tearDown(self):
        pass

    
    def test_to_run_missing_actions(self):
        self.d.to_run = {'a':{}}
        with self.assertRaises(KeyError):
            self.d.actions()


    def test_get_campaign_placement_targets_good_campaign(self):

        # Create new Mock object
        m = MagicMock()
        # Attach json attribute to mock object
        m.json = ujson.loads(GOOD_PROFILE)
        # setting return value to new mock object
        self.d.console.get_profile.return_value = m

        expected = ujson.loads(GOOD_PROFILE)['response']['profile']['platform_placement_targets']
        actual = self.d.get_campaign_placement_targets()
        self.assertEqual(expected, actual)

    def test_get_campaign_placement_targets_bad_campaign(self):

        self.d.console.get_profile.side_effect = KeyError

        with self.assertRaises(KeyError):
            self.d.get_campaign_placement_targets()


    def test_adjust_placement_target_none(self):

        expected = [PLACEMENT_TARGET_1]
        actual = self.d.adjust_placement_target(None, EX_PLACEMENT_ID_1, "include")
        self.assertEqual(expected, actual)

    def test_adjust_placement_target_bad_input(self):

        with self.assertRaises(TypeError):
            self.d.adjust_placement_target([PLACEMENT_TARGET_1_BAD], EX_PLACEMENT_ID_1, "exclude")


    def test_adjust_placement_target_good_input(self):

        ## Containing EX_PLACEMENT_ID_1
        expected_1 = [{'id': EX_PLACEMENT_ID_1, 'action':'exclude', 'deleted': False}]
        actual_1 = self.d.adjust_placement_target([PLACEMENT_TARGET_1], EX_PLACEMENT_ID_1, "exclude")
        self.assertEqual(expected_1, actual_1)

        pairs_1 = zip(expected_1, actual_1)
        for x,y in pairs_1:
            self.assertEqual(x, y)

        ## Not containing EX_PLACEMENT_ID_1
        expected_2 = [ PLACEMENT_TARGET_2, PLACEMENT_TARGET_1]
        actual_2 = self.d.adjust_placement_target([PLACEMENT_TARGET_2], EX_PLACEMENT_ID_1, "include")

        pairs_2 = zip(expected_2, actual_2)
        for x,y in pairs_2:
            self.assertEqual(x, y)


    def test_check_for_no_targeting(self):

        old_placement_targets = PLACEMENT_TARGET_1.copy()
        old_placement_targets['action'] = 'include'
        new_placement_targets = PLACEMENT_TARGET_1.copy()
        new_placement_targets['action'] = 'exclude'
        self.assertTrue(self.d.check_for_no_targeting([old_placement_targets], [new_placement_targets]))

        old_placement_targets['action'] = 'exclude'
        self.assertFalse(self.d.check_for_no_targeting([old_placement_targets], [new_placement_targets]))


    def test_push_log_error(self):

        m = MagicMock()
        m.json = ujson.loads(BAD_OPT_RESPONSE)
        self.d.rockerbox.post.return_value = m

        with self.assertRaises(TypeError):
            self.d.push_log({})

    def test_exclude_placements_missing(self):

        with self.assertRaises(KeyError): 
            self.d.exclude_placements({'1235':{}})


