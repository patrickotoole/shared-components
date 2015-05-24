import mock
import copy
import ujson
import pandas
from .. import helpers
from FIXTURES import *

@helpers.service_params
def post_mock(url,*args,**kwargs):
    service = kwargs['service']
    qs = kwargs['qs']

    def campaign(qs):

        a_campaign = dict(FAKE_ACTIVE_CAMPAIGN.items() + qs.items()) 

        mock_response = mock.Mock()
        mock_response.json = {"response":{"campaign": a_campaign } }

        return mock_response

    def profile(qs):

        a_profile = dict([("id",1)] + qs.items())

        mock_response = mock.Mock()
        mock_response.json = {"response":{"profile": a_profile } }
        return mock_response
 
    services = {
        "campaign": campaign,
        "profile": profile
    }

    return services[service](qs)

@helpers.service_params
def put_mock(url,*args,**kwargs):
    service = kwargs['service']
    qs = kwargs['qs']
    data = ujson.loads(kwargs['data'])

    def campaign(qs):

        d_campaign = dict(data['campaign'].items() + qs.items())
        mock_response = mock.Mock()
        mock_response.json = {"response":{"campaign":d_campaign } }
        return mock_response

    def profile(qs):

        d_profile = dict(data['profile'].items() + qs.items())
        mock_response = mock.Mock()
        mock_response.json = {"response":{"profile":d_profile } }
        return mock_response

        
    services = {
        "campaign": campaign,
        "profile": profile
    }

    return services[service](qs)

@helpers.service_params
def get_mock(url,*args,**kwargs):
    service = kwargs['service']
    qs = kwargs['qs']

    def campaign(qs):

        d_campaign = dict(FAKE_DELETED_CAMPAIGN.items() + qs.items())
        a_campaign = dict(FAKE_ACTIVE_CAMPAIGN.items() + qs.items())
        mock_response = mock.Mock()
        mock_response.json = {"response":{"campaigns":[d_campaign,a_campaign] } }

        return mock_response

    def city(qs):
        mock_response = mock.Mock()
        mock_response.json = {"response":{"cities":FIXTURES.CITY}}
        return mock_response  

    def creative(qs):
        mock_response = mock.Mock()
        mock_response.json = {"response":{"creatives":FIXTURES.CREATIVES}}
        return mock_response

    services = {
        "campaign": campaign,
        "creative": creative,
        "city": city
    }

    return services[service](qs)

@helpers.service_params
def get_all_mock(url,*args,**kwargs):
    service = kwargs['service']
    qs = kwargs['qs']

    def country(qs):
        mock_response = mock.Mock()
        return FIXTURES.COUNTRY
        return mock_response 

    def region(qs):
        mock_response = mock.Mock()
        return FIXTURES.REGION

    services = {
        "country": country,
        "region": region
    }

    return services[service](qs)

def select_dataframe(query):

    if "FROM funnel" in query:
        as_list = [{'pixel_source_name': 'baublebar', 'funnel_name': 'landing+earings', 'url_pattern': 'alans_pattern', 'action_name': 'alans_action', 'operator': 'and', 'owner': 'waikiki', 'order': 1.0, 'funnel_id': 1, 'action_id': 1.0}, {'pixel_source_name': 'baublebar', 'funnel_name': 'landing+earings', 'url_pattern': 'wills_pattern', 'action_name': 'wills_action', 'operator': 'and', 'owner': 'waikiki', 'order': 2.0, 'funnel_id': 1, 'action_id': 2.0}, {'pixel_source_name': 'baublebar', 'funnel_name': 'landing+earings', 'url_pattern': 'alans_pattern2', 'action_name': 'alans_action', 'operator': 'and', 'owner': 'waikiki', 'order': 1.0, 'funnel_id': 1, 'action_id': 1.0}, {'pixel_source_name': 'baublebar', 'funnel_name': 'landing+earings', 'url_pattern': 'wills_pattern_again', 'action_name': 'wills_action', 'operator': 'and', 'owner': 'waikiki', 'order': 2.0, 'funnel_id': 1, 'action_id': 2.0}, {'pixel_source_name': 'baublebar', 'funnel_name': 'other', 'url_pattern': 0, 'action_name': 0, 'operator': 0, 'owner': 'makiki', 'order': 0.0, 'funnel_id': 2, 'action_id': 0.0}]

        return pandas.DataFrame(as_list) 

    elif "from action_patterns" in query:
        as_list = [{'url_pattern': 'http://www.baublebar.com/necklaces.html', 'action_id': 3}, {'url_pattern': 'http://www.baublebar.com/checkout/cart', 'action_id': 3}]

        return pandas.DataFrame(as_list)
     
    elif "from action" in query:

        as_list = [{'pixel_source_name': 'baublebar', 'end_date': '0', 'action_name': 'alans_action', 'operator': 'and', 'start_date': '0', 'action_id': 1}, {'pixel_source_name': 'baublebar', 'end_date': '0', 'action_name': 'wills_action', 'operator': 'and', 'start_date': '0', 'action_id': 2}]

        return pandas.DataFrame(as_list)

    elif "from funnel_actions" in query:

        as_list = [{'order': 1, 'funnel_id': 1, 'action_id': 1}, {'order': 2, 'funnel_id': 1, 'action_id': 2}, {'order': 2, 'funnel_id': 3, 'action_id': 1}, {'order': 1, 'funnel_id': 3, 'action_id': 2}]
        return pandas.DataFrame(as_list)

    
    return pandas.DataFrame([{"external_advertiser_id":1}]) 
 

API = mock.MagicMock()

API.get.side_effect = get_mock
API.get_all_pages.side_effect = get_all_mock 
API.put.side_effect = put_mock 
API.post.side_effect = post_mock 
API.select_dataframe.side_effect = select_dataframe
