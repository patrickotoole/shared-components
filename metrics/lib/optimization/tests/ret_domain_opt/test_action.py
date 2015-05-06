import pandas as pd
import unittest
import sys
sys.path.append("../../")
from ret_domain_opt import DomainAction
from link import lnk

import mock
import ujson
from mock import MagicMock
from copy import deepcopy

## Fixtures
EX_CAMPAIGN = [8173297]
GOOD_PROFILE = u'{"response":{"status":"OK","count":1,"start_element":0,"num_elements":100,"profile":{"id":27496894,"code":null,"description":null,"country_action":"exclude","region_action":"exclude","city_action":"exclude","browser_action":"exclude","use_inventory_attribute_targets":false,"last_modified":"2015-04-21 18:29:30","daypart_timezone":null,"dma_action":"exclude","domain_action":"exclude","domain_list_action":"exclude","inventory_action":"exclude","language_action":"exclude","segment_boolean_operator":"or","min_session_imps":null,"session_freq_type":"platform","carrier_action":"exclude","supply_type_action":"include","device_type_action":"include","screen_size_action":"exclude","device_model_action":"exclude","location_target_radius":null,"location_target_latitude":null,"location_target_longitude":null,"querystring_action":"exclude","querystring_boolean_operator":"and","is_expired":false,"non_audited_url_action":"include","optimization_zone_action":"exclude","advertiser_id":453991,"publisher_id":null,"max_session_imps":null,"max_day_imps":5,"max_lifetime_imps":50,"max_page_imps":null,"min_minutes_per_imp":null,"venue_action":"exclude","operating_system_action":"exclude","require_cookie_for_freq_cap":true,"trust":"seller","allow_unaudited":true,"is_template":false,"created_on":"2015-04-21 18:29:30","operating_system_family_action":"exclude","use_operating_system_extended_targeting":true,"mobile_app_instance_action_include":false,"mobile_app_instance_list_action_include":false,"certified_supply":false,"user_group_targets":null,"country_targets":null,"region_targets":null,"city_targets":null,"inv_class_targets":null,"inventory_source_targets":null,"inventory_attribute_targets":null,"age_targets":null,"daypart_targets":null,"browser_targets":null,"dma_targets":null,"domain_targets":null,"domain_list_targets":[{"id":168872,"name":"00. Global -- Blacklist","description":"","type":"white","deleted":false}],"language_targets":null,"size_targets":null,"zip_targets":null,"member_targets":[{"id":95,"action":"include","third_party_auditor_id":null,"billing_name":"Matomy Media"},{"id":181,"action":"include","third_party_auditor_id":null,"billing_name":"Google AdExchange"},{"id":280,"action":"include","third_party_auditor_id":null,"billing_name":"Microsoft Advertising Exchange"},{"id":357,"action":"include","third_party_auditor_id":null,"billing_name":"OpenX"},{"id":459,"action":"include","third_party_auditor_id":null,"billing_name":"Rubicon"},{"id":1226,"action":"include","third_party_auditor_id":null,"billing_name":"AOL Marketplace"},{"id":1538,"action":"include","third_party_auditor_id":null,"billing_name":"PubSquared LLC"}],"video_targets":null,"segment_group_targets":[{"boolean_operator":"and","segments":[{"id":2497911,"action":"include","start_minutes":null,"expire_minutes":2880,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - All Pages Segment","deleted":false,"other_in_list":null},{"id":2497912,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - Logged In Segment","deleted":false,"other_in_list":null},{"id":2497907,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - Purchase Conversion Pixel","deleted":false,"other_in_list":null}]}],"carrier_targets":null,"supply_type_targets":["web"],"device_type_targets":["other devices"],"screen_size_targets":null,"device_model_targets":null,"querystring_targets":null,"gender_targets":null,"intended_audience_targets":null,"inventory_group_targets":null,"inventory_network_resold_targets":null,"operating_system_targets":null,"operating_system_family_targets":null,"position_targets":{"allow_unknown":true,"positions":null},"site_targets":null,"venue_targets":null,"operating_system_extended_targets":null,"mobile_app_instance_targets":null,"mobile_app_instance_list_targets":null,"optimization_zone_targets":null,"content_category_targets":null,"deal_targets":null,"placement_targets":null,"platform_content_category_targets":null,"platform_placement_targets":null,"platform_publisher_targets":null,"publisher_targets":null,"segment_targets":null,"exelate_targets":null,"ip_range_list_targets":null},"dbg_info":{"instance":"64.bm-hbapi.prod.nym2","slave_hit":true,"db":"mysql-api-slave-04.prod.nym2.adnxs.net","reads":4,"read_limit":100,"read_limit_seconds":60,"writes":1,"write_limit":60,"write_limit_seconds":60,"awesomesauce_cache_used":false,"count_cache_used":false,"warnings":[],"time":142.80986785889,"start_microtime":1430864115.557,"version":"1.15.479","slave_lag":4,"member_last_modified_age":8,"output_term":"profile"}}}\n'

GOOD_PROFILE_DOMAIN_TARGETING_INCLUDE = u'{"response":{"status":"OK","count":1,"start_element":0,"num_elements":100,"profile":{"id":27496894,"code":null,"description":null,"country_action":"exclude","region_action":"exclude","city_action":"exclude","browser_action":"exclude","use_inventory_attribute_targets":false,"last_modified":"2015-04-21 18:29:30","daypart_timezone":null,"dma_action":"exclude","domain_action":"include","domain_list_action":"exclude","inventory_action":"exclude","language_action":"exclude","segment_boolean_operator":"or","min_session_imps":null,"session_freq_type":"platform","carrier_action":"exclude","supply_type_action":"include","device_type_action":"include","screen_size_action":"exclude","device_model_action":"exclude","location_target_radius":null,"location_target_latitude":null,"location_target_longitude":null,"querystring_action":"exclude","querystring_boolean_operator":"and","is_expired":false,"non_audited_url_action":"include","optimization_zone_action":"exclude","advertiser_id":453991,"publisher_id":null,"max_session_imps":null,"max_day_imps":5,"max_lifetime_imps":50,"max_page_imps":null,"min_minutes_per_imp":null,"venue_action":"exclude","operating_system_action":"exclude","require_cookie_for_freq_cap":true,"trust":"seller","allow_unaudited":true,"is_template":false,"created_on":"2015-04-21 18:29:30","operating_system_family_action":"exclude","use_operating_system_extended_targeting":true,"mobile_app_instance_action_include":false,"mobile_app_instance_list_action_include":false,"certified_supply":false,"user_group_targets":null,"country_targets":null,"region_targets":null,"city_targets":null,"inv_class_targets":null,"inventory_source_targets":null,"inventory_attribute_targets":null,"age_targets":null,"daypart_targets":null,"browser_targets":null,"dma_targets":null,"domain_targets":null,"domain_list_targets":[{"id":168872,"name":"00. Global -- Blacklist","description":"","type":"white","deleted":false}],"language_targets":null,"size_targets":null,"zip_targets":null,"member_targets":[{"id":95,"action":"include","third_party_auditor_id":null,"billing_name":"Matomy Media"},{"id":181,"action":"include","third_party_auditor_id":null,"billing_name":"Google AdExchange"},{"id":280,"action":"include","third_party_auditor_id":null,"billing_name":"Microsoft Advertising Exchange"},{"id":357,"action":"include","third_party_auditor_id":null,"billing_name":"OpenX"},{"id":459,"action":"include","third_party_auditor_id":null,"billing_name":"Rubicon"},{"id":1226,"action":"include","third_party_auditor_id":null,"billing_name":"AOL Marketplace"},{"id":1538,"action":"include","third_party_auditor_id":null,"billing_name":"PubSquared LLC"}],"video_targets":null,"segment_group_targets":[{"boolean_operator":"and","segments":[{"id":2497911,"action":"include","start_minutes":null,"expire_minutes":2880,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - All Pages Segment","deleted":false,"other_in_list":null},{"id":2497912,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - Logged In Segment","deleted":false,"other_in_list":null},{"id":2497907,"action":"exclude","start_minutes":null,"expire_minutes":null,"other_less":null,"other_greater":null,"other_equals":null,"code":null,"name":"Twice - Purchase Conversion Pixel","deleted":false,"other_in_list":null}]}],"carrier_targets":null,"supply_type_targets":["web"],"device_type_targets":["other devices"],"screen_size_targets":null,"device_model_targets":null,"querystring_targets":null,"gender_targets":null,"intended_audience_targets":null,"inventory_group_targets":null,"inventory_network_resold_targets":null,"operating_system_targets":null,"operating_system_family_targets":null,"position_targets":{"allow_unknown":true,"positions":null},"site_targets":null,"venue_targets":null,"operating_system_extended_targets":null,"mobile_app_instance_targets":null,"mobile_app_instance_list_targets":null,"optimization_zone_targets":null,"content_category_targets":null,"deal_targets":null,"placement_targets":null,"platform_content_category_targets":null,"platform_placement_targets":null,"platform_publisher_targets":null,"publisher_targets":null,"segment_targets":null,"exelate_targets":null,"ip_range_list_targets":null},"dbg_info":{"instance":"64.bm-hbapi.prod.nym2","slave_hit":true,"db":"mysql-api-slave-04.prod.nym2.adnxs.net","reads":4,"read_limit":100,"read_limit_seconds":60,"writes":1,"write_limit":60,"write_limit_seconds":60,"awesomesauce_cache_used":false,"count_cache_used":false,"warnings":[],"time":142.80986785889,"start_microtime":1430864115.557,"version":"1.15.479","slave_lag":4,"member_last_modified_age":8,"output_term":"profile"}}}\n'


TO_EXCLUDE_FIXTURE_MISSING_METRICS = {
'cnn.com': {'action': 'EXCLUDE',
						'metrics': {u'imps_loaded_cutoff': 1000,
									u'loaded': 1792.0,
									u'visible_ratio': 0.31473214285714285,
									u'visible_ratio_cutoff': 0.40000000000000002},
						'rule_group_id': 64,
						'rule_group_name': 'domain_low_visible'},

'dailymail.co.uk': {'action': 'EXCLUDE',
                     'rule_group_id': 64,
                     'rule_group_name': 'domain_low_visible'}
}


BAD_OPT_RESPONSE = u'{"status":"error","response":"current field value in AppNexus does not match field_old_value. 1100 != 100"}'

class DomainActionTest(unittest.TestCase):
    
    def setUp(self):
        
        lnk.api = mock.MagicMock()
        lnk.rockerbox = mock.MagicMock()
        self.d = DomainAction({}, EX_CAMPAIGN)

    def tearDown(self):
        pass

    def test_get_campaign_domain_targets_good_profile(self):
        
        m = MagicMock()
        m.json = ujson.loads(GOOD_PROFILE)
        self.d.console.get_profile.return_value = m

        expected = ujson.loads(GOOD_PROFILE)['response']['profile']['domain_targets']
        actual = self.d.get_campaign_domain_targets()
        self.assertEqual(expected, actual)

    def test_get_campaign_domain_targets_bogus_campaign(self):
        
        self.d.console.get_profile.side_effect = KeyError

        with self.assertRaises(KeyError):
            self.d.get_campaign_domain_targets()

    def test_get_campaign_domain_targets_bogus_campaign(self):

    	# Testing if domain_action is set to include domains

    	m = MagicMock()
        m.json = ujson.loads(GOOD_PROFILE_DOMAIN_TARGETING_INCLUDE)
        self.d.console.get_profile.return_value = m

        with self.assertRaises(Exception):
        	self.d.get_campaign_domain_targets()


    def test_adjust_domain_target(self):

    	# domain_target is None
    	expected = [{'domain':"domain.com", 'profile_id': 22606190}]
    	actual = self.d.adjust_domain_target(None, "domain.com")
    	self.assertEqual(expected, actual)

    	# domain_target has incorrect keys
    	with self.assertRaises(TypeError):
    		self.d.adjust_domain_target([{'domain':"domain.com", 'wrong_key': 22606190}], "domain.com")

    	# domain already domain_target exists in domain_target
    	actual =  self.d.adjust_domain_target(expected, "domain.com")
    	self.assertEqual(expected, actual)

    	# domain does not existing in domain_target
    	expected = [{'domain':"domain2.com", 'profile_id': 22606190},
    				{'domain':"domain.com", 'profile_id': 22606190}]
    	actual = self.d.adjust_domain_target([{'domain':"domain2.com", 'profile_id': 22606190}], "domain.com")
    	self.assertEqual(expected, actual)


    def test_push_log_error(self):

        m = MagicMock()
        m.json = ujson.loads(BAD_OPT_RESPONSE)
        self.d.rockerbox.post.return_value = m

        with self.assertRaises(TypeError):
            self.d.push_log({})


    def test_exclude_domains_missing_metrics(self):

    	with self.assertRaises(KeyError):
    		self.d.exclude_domains(TO_EXCLUDE_FIXTURE_MISSING_METRICS)

