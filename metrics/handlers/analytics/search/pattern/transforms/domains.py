import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_domains(**kwargs):

    response = kwargs['response']
    df = kwargs['domains']
    idf = kwargs['idf']
    df2 = df.groupby(['domain']).count()
    df3 = df2['uid'].reset_index()
    df3.columns = ['domain', 'count']
    df3 = df3.merge(idf, on='domain', how='left')
    df3 = df3.sort(['count'], ascending=False)
    df3 = df3.fillna('NA')
    data = df3.to_dict('records')
    response['response'] = data

    return response

