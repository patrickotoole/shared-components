import logging
from temporal import *
from lib.helpers import decorators

@decorators.time_log
def process_domain_intersection(urls=None,domains=None,response=None,**kwargs):

    url_ts, domain_ts = url_domain_intersection_ts(urls,domains)

    response['domains'] = domain_ts.T.to_dict()
    response['actions_events'] = url_ts.T.to_dict()

    return response
    
