import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_onsite(**kwargs):

    response = kwargs['response']
    uids = kwargs['uid_urls']
    import ipdb; ipdb.set_trace()
    df = uids.groupby(['uid', 'date']).count()
    df = df.reset_index()
    
    count = df.groupby(['uid']).count()
    uniques = df.groupby(['uid']).sum()
    
    count_filter = count.filter(['uid','url'])
    count_filter.columns = ['sessions']
    uniques_filter = uniques.filter(['uid','url'])
    uniques_filter.columns = ['visits']
    
    total = count_filter.join(uniques_filter)
    total = total.reset_index()
    response['response'] = total.to_dict('records')
    return response

