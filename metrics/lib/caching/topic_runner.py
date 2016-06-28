from cache_runner_base import BaseRunner

import pandas
import logging
import uuid

URL ="/crusher/v2/visitor/domains_full_time_minute/cache?format=json&top=20000&url_pattern={}&filter_id={}"

def make_qs(params):
    import ujson
    qs = ""
    parameters_dict = ujson.loads(params)
    for key,value in parameters_dict.items():
        qs += "&%s=%s" % (str(key), str(value))

    return qs

def compress(data):
    import zlib 
    import codecs

    compressed = zlib.compress(data)
    hexify = codecs.getencoder('hex')
    compress_as_hex = hexify(compressed)
    return compress_as_hex[0]


class TopicRunner(BaseRunner):

    def __init__(self, connectors, advertiser, pattern, filter_id, func_name, job_name, base_url ):

        self.connectors = connectors
        self.advertiser = advertiser
        self.pattern = pattern
        self.func_name = func_name
        self.job_name = job_name

        self.crusher = self.get_crusher_obj(advertiser, base_url)

        self.filter_id = filter_id or self.getActionIDPattern(pattern, self.crusher)

    def extract(self, params):

        _url = URL + make_qs(params)
        url = _url.format(self.pattern, self.action_id)

        resp = self.crusher.get(url, timeout=300)
        resp.raise_for_status()
        return pandas.DataFrame(resp.json['response'])
        

    def transform(self, data):
        from topic.prep_data import prep_data
        from topic.lsi import LSIComparision
        from topic.w2v import Word2VecComparision

        from topic.cluster import cluster, common_words, freq_words, word_importance

        prepped, freq = prep_data(data)#.head(10000))
        docs = len(prepped)
        idf = { i:docs/j for i,j in freq.items()}
        logging.info("finished word prep")
        words = prepped.words.tolist()
        comp2 = Word2VecComparision([i for i in words if len(i) > 2])
        comp = LSIComparision([i for i in words if len(i) > 2])


        
        
        import numpy as np
        import math
        
        #norm = np.vectorize(lambda x: (x/math.sqrt(2))**2 )
        #_sqrt = np.vectorize(lambda x: math.sqrt(x) )
        #s1 = norm(comp.similarity)
        #s2 = norm(np.array(comp2.similarity))

        #similarity = _sqrt(np.add(s1,s2))

        #similarity = (0.3)*comp.similarity + (0.7)*np.array(comp2.similarity)
        similarity = np.array(comp.similarity)

        
        upper_triangle = np.triu_indices(len(similarity),1)
        upper = similarity[upper_triangle]

        mask = (similarity > np.percentile(upper,25)) & (similarity < np.percentile(upper,75))
        smask = np.ma.array(similarity,mask=mask,fill_value=0)
        masked = smask.filled()
        
        distance = 1-masked
        pdist = distance[upper_triangle]


        import scipy.spatial.distance
        
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
        recs['idf'] = recs.topic.map(lambda x: sum([idf[i]for i in x.split()]) )
        return recs


        #ddd['similar_1'] = ddd.word_counts.map(lambda x:  comp.compare( " ".join(x.keys()) )[:20] )
        #ddd['similar_2'] = ddd.word_counts.map(lambda x: comp2.compare( " ".join(x.keys()) )[:20] if len(x.keys()) else [] )

        #ddd['set_1'] = ddd['similar_1'].map(lambda x: set([i for i,j in x]) )
        #ddd['set_2'] = ddd['similar_2'].map(lambda x: set([i for i,j in x]) )


        #import ipdb; ipdb.set_trace()

        #ddd['intersection'] = ddd.apply(lambda x: set(x.articles).intersection(x.set_1.intersection(x.set_2)) ,axis=1)
        #ddd['intersection_size'] = ddd['intersection'].map(len)


        ## unique words
        #recs = clustered_df.groupby("group").apply(common_words)
        #freqs = clustered_df.groupby("group").apply(freq_words)

        #unique_words = word_importance(recs[recs > 1], recs.unstack(1).count())
        #group_common_words = word_importance(freqs, 1)

        #
        ## end unique words

        #
        #joined = groups.join(unique_words.T).join(group_common_words.T,rsuffix="_group").sort_index(by="title").fillna("")
        #full_join = clustered_df.set_index("group").join(joined,lsuffix="_count")
        #group_obj = full_join[full_join.keywords.map(len) > 0].reset_index().groupby("group")
        #group_matches = group_obj.apply(lambda x: x.title_count.map(lambda y: len(set(y.split(" ")).intersection(set(x.iloc[0].keywords)))  ).sum() )
        #
        #joined['matches'] = group_matches
        #
        #indices = joined.fillna(0).sort_index(by="matches").index
        #recs = clustered_df.set_index("group").ix[indices]        

        #title_groups = recs.title.map(lambda x: "-".join(x.split(" ")) ).reset_index().set_index("title")
        #data_title = data.set_index("word_index")
        #data_title['groups'] = title_groups

        #group_matches.name = "matches"

        #data_title = data_title.reset_index().merge(group_matches.reset_index(),left_on="groups",right_on="group",how="left")
      
        ##tops = self.compute_top_clusters(groups)
        ##recs = self.compute_recs(tops,groups)


        #data_title_to_insert = data_title.dropna()
        #return data_title_to_insert

    def load(self, data):
        to_insert = data.reset_index()[["domain","url","parent_category_name","word_index","group","count","uniques","matches","topic","score","idf"]]
        to_insert["advertiser"] = self.advertiser
        to_insert["pattern"] = self.pattern
        to_insert["filter_id"] = self.filter_id

        to_insert = to_insert.drop_duplicates("word_index")


        db = self.connectors['crushercache']
        from lib.pandas_sql import s as _sql
        _sql.write_frame(to_insert, "action_topics", db.create_connection(), "mysql","append")

        return 


    def __enter__(self):
        self.accounting_entry_start(self.advertiser, self.pattern, self.func_name, self.job_name, self.action_id)
        

    def __exit__(self, exc_type, exc_value, traceback):

        if exc_type:
            logging.info(traceback)
            logging.info("Data not inserted")
        else:
            self.accounting_entry_end(self.advertiser, self.pattern, self.func_name, self.job_name, self.action_id)




def runner(advertiser=None, pattern=None, func_name=None, base_url=None, indentifiers=None, filter_id=False, **kwargs):
    if None in [advertiser, pattern, func_name, base_url, indentifiers]:
        assert(False, "missing required params")

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters","{}")
    
    atr = TopicRunner(connectors, advertiser, pattern, filter_id, func_name, job_name, base_url )

    with atr:
        data = atr.extract(parameters)
        transformed = atr.transform(data)
        print atr.load(transformed)
                
        logging.info("Data inserted")

if __name__ == "__main__":
    connectors = TopicRunner.get_connectors()
    runner("warby_parker","/","testing","http://beta.crusher.getrockerbox.com",False,connectors=connectors)


