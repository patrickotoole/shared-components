import pandas
import logging

from lib.helpers import decorators
from twisted.internet import defer

def process_model(uid_urls=None,domains=None,response=None,**kwargs):

    uids = list(set(uid_urls.uid.values))
    response['results'] = uids
    response['summary']['num_users'] = len(response['results'])

    _domains = domains.groupby(["uid","domain"])['timestamp'].count()
    _domains.name = "exists"

    response['summary']['num_domains'] = len(set(_domains.reset_index().domain))
    response['domains'] = list(_domains.reset_index().domain)
    response['summary']['num_points'] = len(_domains.reset_index().domain)
    response['summary']['num_users_with_domains'] = len(set(_domains.reset_index().uid))

    prepped = _domains.unstack(1).fillna(0)
    try:
        if len(_domains) < 100: raise "Error: too few domains"
        clusters, similarity, uid_clusters = cluster(_domains, prepped)

        response['clusters'] = clusters
        response['similarity'] = similarity
        response['uid_clusters'] = uid_clusters

    except Exception as e:
        logging.info("Issue building the model", e)
        pass

    return response


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
    _unique_uids = _domains.reset_index().uid.unique()

    _uids = list(set(_unique_uids[:250] + _unique_uids[-250:]))
    _domains = _domains.ix[_uids]
    import sklearn.cluster

    from gensim.models import Word2Vec

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

    domain_dict = { domain:group for group,domains in cluster_domains.items() for domain in domains }
    _domain_matrix = _domains.unstack(1).fillna(0)
    
    sq = _domain_matrix.T.dot(_domain_matrix)
    sq.values[pandas.np.tril_indices_from(sq)] = 0
    

    # UID to domain clusters
   
    mm = sklearn.cluster.bicluster.SpectralCoclustering(n_clusters=20)
    domain_idx = mm.fit(_domains.unstack(1).fillna(0).values)
    from collections import Counter

    def cluster(x):
        l = list(Counter(map(lambda y: domain_dict.get(y,0), x[x>0].index)).most_common(1)[0])
        return pandas.Series(l,index=["cluster","value"])

    cluster_eval = _domains.unstack(1).T.apply(cluster).T

    j = 0
    _nodes = []
    _nodes_dict = {}

    _domain_dict = domain_dict
    _domain_dict = dict(zip(_domains.unstack(1).fillna(0).columns,mm.column_labels_))
    for domain in _domains.unstack(1).columns:
        if domain_dict.get(domain,False):
            _nodes += [{"node":j, "name":str(domain), "group":int(_domain_dict.get(domain,0)) }]
            _nodes_dict[domain] = j
            j = j + 1

    # j = 0
    _uids = [] 
    _uids_dict = {}

    uid_cluster = cluster_eval.cluster.to_dict()
    uid_cluster = dict(zip(_domains.unstack(1).fillna(0).index,mm.row_labels_))
    for uid in _domains.unstack(1).index:
        if uid_cluster[uid]:
            _uids += [{"node":j, "uid":str(uid), "group":int(uid_cluster[uid]) } ]
            _uids_dict[uid] = j 
            j = j + 1


    _links = []
    for uid, row in _domains.unstack(1).fillna(0).iterrows():
        for i,j in row.to_dict().items():
            if j > 0 and _nodes_dict.get(i,False) and _uids_dict.get(uid,False):
                _links += [ {"target":_uids_dict[uid],"source":_nodes_dict[i],"value":1} ]



    # Domain clusters
    i = 0
    nodes = []

    for domain in sq.columns:
        if domain_dict.get(domain,False) is not False:
            nodes += [{"node":i, "name":domain, "group": ( domain_dict.get(domain,0) + 1 ) }]
            i = i + 1

    
    node_dict = {obj["name"]:obj["node"] for obj in nodes}

    links = [j for i in sq.apply(lambda x: [
            {"target":node_dict[i],"source":node_dict[x.name], "value":len(str(v)) } 
            for i,v in x[x>0].to_dict().items() 
            if node_dict.get(i,False) and node_dict.get(x.name,False) 
        ] ).to_dict().values() 
        for j in i
    ]





    obj = {
        "nodes": nodes,
        "links": links
    }

    uid_clusters = {
        "nodes": _nodes + _uids,
        "links": _links
    }


    logging.info("Model summary complete")

    return (summarize_model(prepped,cluster_domains), obj, uid_clusters)
