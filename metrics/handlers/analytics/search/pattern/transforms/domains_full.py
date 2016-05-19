import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_domains_full(**kwargs):

    response = kwargs['response']
    df = kwargs['domains_full']
    idf = kwargs['idf']
    df2 = df.groupby(['url','domain']).count()
    df3 = df2['uid'].reset_index()
    df3.columns = ['url','domain', 'count']
    
    dfA = df.groupby(['url','uid'])
    dfB = dfA.count().reset_index().groupby(['url']).count()
    dfC = dfB['uid'].reset_index()
    dfC.columns = ['url','uniques']

    df4 = df3.merge(dfC, on='url')

    df5 = df4.merge(idf, on='domain', how='left')
    df5 = df5.sort(['uniques','count'], ascending=False)
    df5 = df5.fillna('NA')
    data = df5.to_dict('records')
    response['response'] = data

    return response

