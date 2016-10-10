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
           
        import pickle
        pickle.dump(comp, open("LDAmodelobject.p","wb"))


    def classify_all(self, comp):
        topics = {}
        best_topics = {}
        for top in comp.topics.keys():
            topic_as_string = comp.lda_model.print_topic(comp.topics[top][0])
            topics_list = topic_as_string.split("+")
            topic_num_weight = {}
            for x in topics_list:
                topic_num_weight[int(x.split("*")[1])] = float(x.split("*")[0])
            topic_string_list = []
            for y in topic_num_weight.keys():
                if topic_num_weight[y] > 0.05:
                    topic_string_list.append(comp.dictionary.get(y))
            topics[top] = ("-".join(topic_string_list), comp.topics[top][1])

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


