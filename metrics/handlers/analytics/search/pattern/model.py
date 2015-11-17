import pandas
import sklearn.cluster
import logging

from gensim.models import Word2Vec


def build_sentences(df,group,column):
    _df = df.reset_index()

    assert(group in _df.columns)
    assert(column in _df.columns)


    sentence_series = _df.groupby(group)[column].agg(lambda x: list(x))
    sentences = sentence_series.values

    return sentences

def summarize_model(prepped,cluster_domains):
    summed = prepped.sum()
    cluster_user_stats = []
    for i,j in cluster_domains.items():
        obj = {}

        relevant = prepped[j]
        users = relevant[relevant.T.sum() > 0]
        num_users = len(users)
        num_domains = len(j)

        obj["num_users"] = num_users
        obj["num_domains"] = num_domains
        obj['users_per_domain'] = num_users/num_domains

        obj['users'] = list(users.index)
        obj['domains'] = cluster_domains[i]
        obj['cluster'] = i
        cluster_user_stats.append(obj)
        
    cluster_user_stats = sorted(cluster_user_stats,key=lambda x: x['users_per_domain'])
    return cluster_user_stats

def cluster(_domains, prepped):

    logging.info("Word2Vec model started")

    sentences = build_sentences(_domains,"uid","domain")
    model = Word2Vec(sentences,min_count=4)

    logging.info("Word2Vec model complete")

    max_clusters = min(15,max(2,len(prepped.columns)/50))
    km = sklearn.cluster.KMeans(n_clusters=max_clusters)
    idx = km.fit_predict(model.syn0)

    logging.info("K-means model complete")
    
    df = pandas.DataFrame([dict(zip(model.index2word,idx))]).T
    cluster_domains = df.reset_index().groupby(0)['index'].agg(lambda x: list(x)).to_dict()

    logging.info("Model summary complete")

    return summarize_model(prepped,cluster_domains)
    
