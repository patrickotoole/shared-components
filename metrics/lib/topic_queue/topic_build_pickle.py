from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid

class TopicBatch(BaseRunner):

    def __init__(self, connectors):

        self.connectors = connectors

    def __enter__(self):
        import os.path as path

    def __exit__(self,a,b,c):
        import shutil

    def transform_and_save(self, data, file_local, number_files, use_title):
        from topic.prep_data import prep_data
        from topic.lsi import LSIComparision
        
        prepped, freq = prep_data(data, use_title)
        docs = len(prepped)
        logging.info("finished word prep")
        words = prepped.words.tolist()
        words = [i for i in words if len(i) > 2]
        del(freq)
        comp = LSIComparision([i for i in words if len(i) > 2],build=False)
        import numpy as np
        
        del(words)
        del(prepped)
        del(data)
        del(docs)
        import pickle
        pickle.dump(comp, open("LSImodelobject.p","wb"))


def runner( **kwargs):

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters",{})
    atr = TopicBatch(connectors)
    with atr: 
        data = connectors['crushercache'].select_dataframe("select url, title from url_title")
        atr.transform_and_save(data, kwargs.get("file_location"), kwargs.get("num_files"), kwargs.get("use_title"))

if __name__ == "__main__":
    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("file_location", default="")
    define("num_files", default=50)
    define("use_title", type=bool, default=False)

    basicConfig(options={})

    parse_command_line()
    connectors = TopicBatch.get_connectors()
    runner(file_location=options.file_location, num_files=options.num_files,use_title=options.use_title,connectors=connectors)


