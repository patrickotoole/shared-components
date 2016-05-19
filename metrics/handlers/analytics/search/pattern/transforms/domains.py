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

    dfA = df.groupby(['domain','uid'])
    dfB = dfA.count().reset_index().groupby(['domain']).count()
    dfC = dfB['uid'].reset_index()
    dfC.columns = ['domain','uniques']

    df4 = df3.merge(dfC, on='domain')

    df5 = df4.merge(idf, on='domain', how='left')
    df4 = df4.sort(['count'], ascending=False)
    df4 = df4.fillna('NA')
    data = df4.to_dict('records')
    response['response'] = data

    return response

