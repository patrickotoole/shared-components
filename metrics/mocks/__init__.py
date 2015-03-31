import mock
import copy
import ujson


FAKE_ACTIVE_CAMPAIGN = {
    "id": 1,
    "name": "test",
    "base_bid": 1,
    "daily_budget": 100,
    "state": "active",
    "creatives": [],
    "comments": ""
}
FAKE_DELETED_CAMPAIGN = copy.copy(FAKE_ACTIVE_CAMPAIGN)
FAKE_DELETED_CAMPAIGN["comments"] = "deleted"
FAKE_DELETED_CAMPAIGN["state"] = "inactive" 

def service_params(fn):

    def qs_to_dict(params):
        qs = []
        if len(params):
            split_params = params.split("&")
            for kv in split_params:
                kvalue = kv.split("=")
                qs += [(kvalue[0],kvalue[1])]
        return dict(qs)
 

    def fn_with_kwargs(url,*args,**kwargs):
        split = url[1:].split("?")
        extra = {
            "service": split[0],
            "qs": qs_to_dict(split[1] if len(split) > 1 else "")
        }

        kwargs = dict(extra.items() + kwargs.items())
        return fn(url,*args, **kwargs)

    return fn_with_kwargs

@service_params
def post_mock(url,*args,**kwargs):
    service = kwargs['service']
    qs = kwargs['qs']

    def campaign(qs):

        d_campaign = dict(fake_deleted_campaign.items() + qs.items())
        a_campaign = dict(fake_active_campaign.items() + qs.items())

        mock_response = mock.mock()
        mock_response.json = {"response":{"campaigns":[d_campaign,a_campaign] } }

        return mock_response

    def profile(qs):
        mock_response = mock.mock()
        return mock_response
 
    services = {
        "campaign": campaign,
        "profile": profile
    }

    return services[service](qs)

@service_params
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
        mock_response = mock.Mock()
        return mock_response
     
    services = {
        "campaign": campaign,
        "profile": profile
    }

    return services[service](qs)

@service_params
def get_mock(url,*args,**kwargs):
    service = kwargs['service']
    qs = kwargs['qs']

    def campaign(qs):

        d_campaign = dict(FAKE_DELETED_CAMPAIGN.items() + qs.items())
        a_campaign = dict(FAKE_ACTIVE_CAMPAIGN.items() + qs.items())

        mock_response = mock.Mock()
        mock_response.json = {"response":{"campaigns":[d_campaign,a_campaign] } }

        return mock_response

    services = {
        "campaign": campaign
    }

    return services[service](qs)

API = mock.MagicMock()

API.get.side_effect = get_mock
API.put.side_effect = put_mock 
API.post.side_effect = post_mock 

