from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid

class TopicBatch(BaseRunner):

    def __init__(self, connectors):

        self.connectors = connectors


    def transform_and_save(self, data, use_title,number_files):
        from topic.prep_data import prep_data
        from topic.lsi import LSIComparision
        from topic.w2v import Word2VecComparision

        from topic.cluster import cluster, common_words, freq_words, word_importance
        import pickle 
        comp = pickle.load(open('LSImodelobject.p', 'rb'))
        from tempfile import mkdtemp
        import os.path as path
        filename = path.join(mkdtemp(), 'newfile.dat')
        map_to_disk =None
        y1 = None
        import numpy as np
        for i in range(0,number_files):
            #fname = "%smatrix%s.npy" % (file_local, i)
            fname = "%smatrix%s.npy" % ("", i)
            print i
            tempdata = np.load(fname)
            if map_to_disk is None:
                map_to_disk = np.memmap(filename, mode='w+', dtype='float32',shape=(tempdata.shape[1],tempdata.shape[1]))
            if y1 is None:
                y1=0
            y2 = tempdata.shape[0]+y1
            map_to_disk[y1:y2,] = tempdata
            y1=y2
            del(tempdata)
        prepped, freq = prep_data(data, use_title)
        import ipdb; ipdb.set_trace()
        similarity = np.array([i for i in comp.similarity])
        del(comp.similarity)
        comp.similarityVectors = map_to_disk
        #similarity = comp.similarity.index
        
        import ipdb; ipdb.set_trace() 
        #upper_triangle = np.triu_indices(len(similarity),1)
        #upper = similarity[len(similarity)]

        mask = (similarity > np.percentile(upper,25)) & (similarity < np.percentile(upper,75))
        smask = np.ma.array(similarity,mask=mask,fill_value=0)
        masked = smask.filled()
        
        distance = 1-masked
        pdist = distance[upper_triangle]


        import scipy.spatial.distance
        import ipdb; ipdb.set_trace() 
        square = scipy.spatial.distance.squareform(pdist)
        y = scipy.spatial.distance.squareform(square)
        comp.similarityMatrix = np.abs(y)
        
        clusters = cluster(comp.similarityMatrix)

        comp.joined_data = map(lambda x: " ".join(x),comp.data)
        clustered_df = pandas.DataFrame( zip(comp.joined_data, clusters) )
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

        #ddd['word_counts'] = ddd.articles.map(_word_counts)
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
    atr.transform_and_save(data, kwargs.get("use_title",True), kwargs.get("num_files"))

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("use_title", type=bool, default=True)
    define("num_files", default=50)
    basicConfig(options={})

    parse_command_line()
    connectors = TopicBatch.get_connectors()
    runner(use_title=options.use_title,num_files=options.num_files,connectors=connectors)


