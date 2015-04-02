import mock
import copy
import ujson
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
 

API = mock.MagicMock()

API.get.side_effect = get_mock
API.get_all_pages.side_effect = get_all_mock 
API.put.side_effect = put_mock 
API.post.side_effect = post_mock 

