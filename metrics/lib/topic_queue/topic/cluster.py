def cluster(data, depth=4, cluster_depth=3):
    import scipy.cluster
    Z = scipy.cluster.hierarchy.linkage(data, method='single')
    R = scipy.cluster.hierarchy.inconsistent(Z, d=depth)

    # clusters = scipy.cluster.hierarchy.fcluster(Z, 1.1, criterion='inconsistent', depth=cluster_depth, R=None,monocrit=None)
    clusters = scipy.cluster.hierarchy.fcluster(Z, 1, criterion='inconsistent', depth=cluster_depth, R=None,monocrit=None)

    return clusters

def common_words(df):
    from collections import Counter
    c = Counter()
    titles = df.title
    word_list = titles.map(lambda x: x.split(" ") ).tolist()
    for sentence in word_list:
        c.update( list(set(sentence)) )

    import pandas
    word_freq = pandas.Series(dict(c))

    return word_freq

def freq_words(df):
    from collections import Counter
    c = Counter()
    titles = df.title
    word_list = titles.map(lambda x: x.split(" ") ).tolist()
    for sentence in word_list:
        c.update( list(set(sentence)) )

    import pandas
    word_freq = pandas.Series(dict(c))

    return word_freq/len(df)

def word_importance(grouped_words,denom=1):
    recs = grouped_words
    word_ownership = recs.unstack(1)/denom
    word_cluster_score = word_ownership.unstack(1)
    
    tiles = word_cluster_score.dropna().describe()
    cluster_words = word_cluster_score[(word_cluster_score > tiles['25%'])]
    
    cluster_key_words = cluster_words.groupby(level=1).apply(lambda x: [i for i,j in x.index] )
    cluster_key_words.name = "keywords"


    import pandas
    return pandas.DataFrame([cluster_key_words])
    #tiles = word_cluster_score.dropna().describe()
    #cluster_words = word_cluster_score[(word_cluster_score > tiles['25%'])]
    #cluster_extras = word_cluster_score[(word_cluster_score < tiles['25%'])]
    #
    #cluster_key_words = cluster_words.groupby(level=1).apply(lambda x: [i for i,j in x.index] )
    #cluster_key_words.name = "keywords"

    #cluster_non_key_words = cluster_extras.groupby(level=1).apply(lambda x: [i for i,j in x.index] )
    #cluster_non_key_words.name = "non_keywords"

    #import pandas
    #return pandas.DataFrame([cluster_key_words,cluster_non_key_words])
