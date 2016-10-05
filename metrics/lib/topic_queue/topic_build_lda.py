from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid

class TopicBatch(BaseRunner):

    def __init__(self, connectors):

        self.connectors = connectors

    def transform_and_save(self, data, use_title, num_topics):
        from topic.prep_data import prep_data
        from topic.lda import LSIComparision
        from topic.w2v import Word2VecComparision

        from topic.cluster import cluster, common_words, freq_words, word_importance
        
        prepped, freq = prep_data(data, use_title)#.head(10000))
        docs = len(prepped)
        #idf = { i:docs/j for i,j in freq.items()}
        logging.info("finished word prep")
        words = prepped.words.tolist()
        words = [i for i in words if len(i) > 2]
        comp = LSIComparision([i for i in words if len(i) > 2], build=True)
        import numpy as np
        import ipdb; ipdb.set_trace()
        topics = {}
        best_topics = {}
        for top in comp.topics.keys():
            topic_as_string = comp.lda_model.print_topic(comp.topics[top][0])
            topics_list = topic_as_string.split("+")
            topic_numbers = [int(x.split("*")[1]) for x in topics_list]
            topics_string_list = [comp.dictionary.get(y) for y in topic_numbers]
            topics[top] = ("-".join(topics_string_list), comp.topics[top][1])
            if comp.topics[top][1] > 0.7:
                best_topics[top] = ("-".join(topics_string_list), comp.topics[top][1])
            
        import ipdb; ipdb.set_trace()

        from sklearn import cluster
        import ipdb; ipdb.set_trace()
        #for ww in words:
        #    import ipdb; ipdb.set_trace()
        #    tw[index] = ww[0]
        #    index+=1
        import ipdb; ipdb.set_trace()
        #import ipdb; ipdb.set_trace()
        del(freq)
        import os
        _proc_status = '/proc/%d/status' % os.getpid()
        t = open(_proc_status)
        v = t.read()
        t.close()
        print v[200:220]
        #comp = LSIComparision([i for i in words if len(i) > 2], build=False)
        #import pickle
        #import numpy as np
        #comp = pickle.load(open("LSImodelobject.p","rb"))
        #comp.similarityMatrix = comp.similarityVectors.dot(comp.similarityVectors.T)
        #import pickle
        #pickle.dump(comp, open("LSImodelobject.p","wb"))
        #similarity = np.array([i for i in comp.similarity])
        
        del(words) 
        similarity = np.array(comp.similarity.index)
        upper_triangle = np.triu_indices(len(similarity),1)
        upper = similarity[upper_triangle[0]]
        del(comp.similarity)
        del(comp.similarityMatrix)
        from scipy import sparse
        mask = (similarity > np.percentile(upper,25)) & (similarity < np.percentile(upper,75))
        smask = np.ma.array(similarity,fill_value=0)
        masked = smask.filled()
        distance = 1-masked
        pdist = distance[upper_triangle[0]]

        del(upper_triangle)
        del(similarity)
        del(upper)
        import ipdb; ipdb.set_trace()
        import scipy.spatial.distance
        square = scipy.spatial.distance.squareform(pdist)
        y = scipy.spatial.distance.squareform(square)
        comp.similarityMatrix = np.abs(y)
        
        clusters = cluster(comp.similarityMatrix)
        #cluster.AgglomerativeClustering(comp.similarityMatrix)
        #clusters = cluster(comp)

        comp.joined_data = map(lambda x: " ".join(x),comp.data)
        clustered_df = pandas.DataFrame( zip(comp.joined_data, clusters) )
        import ipdb;ipdb.set_trace()
        clustered_df.columns = ["title","group"]
        logging.info("finished")

        groups = clustered_df.groupby("group").count()
        group_ids = groups.sort_index(by="title").tail(5).index

        ddd = clustered_df.groupby("group").apply(lambda x: pandas.Series({"count":len(x),"articles":list(x.title)}) ).sort_index(by="count")

        def _word_counts(sentence_list):
            from collections import Counter
            c = Counter()
            map(c.update,[list(set(i.split(" "))) for i in sentence_list])
            return dict([(i,j)for i,j in c.most_common(2) if j > 1])
        
        from collections import Counter
        ddd['topics'] = ddd.articles.map(" ".join).map(lambda x: x.split()).map(Counter).map(lambda x: { i:j for i,j in x.most_common(4) if j > 1}.keys() )
        logging.info("topics")
        LIMIT_COMPS = 10

        ddd['comps'] = ddd[ddd.topics.map(len) > 1].topics.map(" ".join).map(comp.compare)#.map(lambda x: x[:LIMIT_COMPS])
        logging.info("comps")

        groups_with_comps = ddd[ddd.comps.fillna("").map(len) > 1]
        actual_comps = groups_with_comps.apply(lambda xxx: pandas.Series({
            "comps":[i[0] for i in xxx.comps if len( set(i[0].split()).intersection(set(xxx.topics)) ) > 0],
            "score":[i[1] for i in xxx.comps if len( set(i[0].split()).intersection(set(xxx.topics)) ) > 0]

        }) ,axis=1)
        ddd['actual_comps'] = actual_comps.comps
        ddd['comp_score'] = actual_comps.score


        #sub_select = ddd[ddd.actual_comps.fillna("").map(len) > 0][["actual_comps","topics"]]
        sub_select = ddd[ddd.actual_comps.fillna("").map(len) > 0][["actual_comps","topics","comp_score"]]

        articles_with_groups = sub_select.groupby(level=0).apply(lambda x: pandas.DataFrame([{"score":score, "topic":" ".join(x.topics.iloc[0])} for score in x.comp_score.iloc[0]],index=x.actual_comps.iloc[0]) ).reset_index()


        #articles_with_groups = sub_select.groupby(level=0).apply(lambda x: pandas.DataFrame([{"topic":" ".join(x.topics.iloc[0])}]*len(x.actual_comps.iloc[0]),index=x.actual_comps.iloc[0]) ).reset_index()
        articles_with_groups['word_index'] = articles_with_groups.level_1.map(lambda x: "-".join(x.split(" ")))

        recs = prepped[prepped.word_index.fillna("").map(len) > 0].merge(articles_with_groups,on="word_index",how="right").fillna("")
        group_matches = articles_with_groups.drop_duplicates("word_index").groupby("group")['word_index'].count()
        group_matches.name = "matches"
        group_matches = group_matches.reset_index()

        recs = recs.merge(group_matches,on="group")
        del recs['level_1']
        recs = recs.groupby("group").apply(lambda x: x.sort_index(by="score").tail(LIMIT_COMPS) )
        del recs['group']
        recs = recs.reset_index()
        #recs['idf'] = recs.topic.map(lambda x: sum([idf[i]for i in x.split()]) )

        f = open("rec_df.csv","w")
        f.write(recs.to_csv())
        f.close()

def runner( **kwargs):

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters",{})
    atr = TopicBatch(connectors)
    data = connectors['crushercache'].select_dataframe("select url, title from url_title")
    atr.transform_and_save(data, kwargs.get("use_title"), kwargs.get("num_topics"))

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("use_title", type=bool, default=False)
    define("num_topics", default=30)

    basicConfig(options={})

    parse_command_line()
    connectors = TopicBatch.get_connectors()
    runner(use_title=options.use_title,num_topics=options.num_topics,connectors=connectors)


