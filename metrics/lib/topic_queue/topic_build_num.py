from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid

class TopicBatch(BaseRunner):

    def __init__(self, connectors):

        self.connectors = connectors

    def transform_and_save(self, data, use_title):
        from topic.prep_data import prep_data
        from topic.lsi import LSIComparision
        from topic.w2v import Word2VecComparision

        from topic.cluster import cluster, common_words, freq_words, word_importance
        
        prepped, freq = prep_data(data, use_title)#.head(10000))
        docs = len(prepped)
        idf = { i:docs/j for i,j in freq.items()}
        logging.info("finished word prep")
        words = prepped.words.tolist()
        words = [i for i in words if len(i) > 2]
        import ipdb; ipdb.set_trace()
        del(freq)
        import os
        _proc_status = '/proc/%d/status' % os.getpid()
        t = open(_proc_status)
        v = t.read()
        t.close()
        print v[200:220]
        _proc_status = '/proc/%d/status' % os.getpid()
        t = open(_proc_status)
        v = t.read()
        t.close()
        print v[200:220]
        comp = LSIComparision([i for i in words if len(i) > 2])

def runner( **kwargs):

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters",{})
    atr = TopicBatch(connectors)
    data = connectors['crushercache'].select_dataframe("select url, title from url_title")
    atr.transform_and_save(data, kwargs.get("use_title",True))

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("use_title", type=bool, default=False)

    basicConfig(options={})

    parse_command_line()
    connectors = TopicBatch.get_connectors()
    runner(use_title=options.use_title,connectors=connectors)


