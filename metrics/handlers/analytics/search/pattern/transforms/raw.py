import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_raw(**kwargs):

    response = kwargs['response']
    for k in kwargs.keys():
        if type(kwargs[k]) == type(pandas.DataFrame()):
            response[k] = kwargs[k].to_dict()
    response['artifacts'] = kwargs['artifacts'] 
    return response

