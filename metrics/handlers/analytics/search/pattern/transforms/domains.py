import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_domains(response=None,**kwargs):


    RANK = 'Importance'
    COLS = ['rank','domain','idf','num_users', 'count', 'uniques','Importance','category_name','parent_category_name']

    BLACKLIST = ['collective-exchange.com','anonymous.pubmatic.com']
    domains = kwargs['domains']
    domains = domains[domains['domain']!="NA"]
    domains['domain'] = domains['domain'].apply(lambda x: x.lower())
    domains = domains[domains['domain'].apply(lambda x: x not in BLACKLIST)]

    # Getting count and uniques columns
    uniques = domains.groupby('domain').apply(lambda x: len(x['uid'].unique())).reset_index()
    uniques.columns = ['domain','uniques']
    counts = domains.groupby('domain').apply(lambda x: len(x)).reset_index()
    counts.columns = ['domain','count']
    data = uniques.merge(counts, on = 'domain', how = 'outer')

    def tail_diff(data, num_users, kwargs, idf = True):

        if not idf:
            idfs = pd.read_pickle("/root/datascience-steve/qbr/YoshiBot/pop_data/pop_domains.p")
            idfs = idfs[idfs['domain']!= "NA"]
        else:
            idfs = kwargs['idf']

        merged = data.merge(idfs, on = 'domain', how = 'left')
        merged[['idf']] = merged[['idf']].fillna(idfs['idf'].mean())
        merged['pct_users'] = merged['uniques'] / float(num_users)
        # merged['tail_diff'] = merged['pct_users'] / (1./merged['idf'])
        merged['tfidf'] = merged['uniques'] * merged['idf']
        return merged[['domain','tfidf','idf','pct_users','category_name','parent_category_name','num_users']]

    num_users = len(domains['uid'].unique())
    tail_diff_data = tail_diff(data, num_users, kwargs)

    data = data.merge(tail_diff_data, on = 'domain', how = 'left')

    data['Importance'] = data['tfidf']
    data['rank'] = data[RANK]

    data = data.fillna(0)

    response['response'] = data[COLS].to_dict('records')

