from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid

class TopicBatch(BaseRunner):

    def __init__(self, connectors):

        self.connectors = connectors

    def __enter__(self):
        import os.path as path
        from tempfile import mkdtemp
        import os.path as path
        filename = path.join(mkdtemp(), 'newfile.dat')
        self.fname = filename

    def __exit__(self,a,b,c):
        import shutil
        del(self.fname)

    def transform_and_save(self, data, file_local, number_files, use_title):
        from topic.prep_data import prep_data
        from topic.lsi import LSIComparision
        from topic.w2v import Word2VecComparision

        from topic.cluster import cluster, common_words, freq_words, word_importance
        
        prepped, freq = prep_data(data, use_title)
        docs = len(prepped)
        idf = { i:docs/j for i,j in freq.items()}
        logging.info("finished word prep")
        words = prepped.words.tolist()
        words = [i for i in words if len(i) > 2]
        del(freq)
        comp = LSIComparision([i for i in words if len(i) > 2],build=False)
        
        import numpy as np
        simvector = None
        
        y1 = None
        counter = 0
        from scipy import sparse
        map_to_disk=None
        del(words)
        del(prepped)
        del(data)
        for i in range(0,number_files):
            fname = "%sf%s.npy" % (file_local, i)
            print i
            tempdata = np.load(fname)
            #tempdata = sparse.csc_matrix((loader['data'], loader['indices'], loader['indptr']),shape = (loader['shape'][1],loader['shape'][0]))
            #del(loader)
            if map_to_disk is None:
                map_to_disk = tempdata
                #sparse_mat = sparse.dok_matrix(shape=(tempdata.shape[1],tempdata.shape[1]))
                map_to_disk = np.memmap(self.fname, mode='w+', dtype='float32',shape=(tempdata.shape[1],tempdata.shape[1]))
                #map_to_disk = sparse.lil_matrix((tempdata.shape[1],tempdata.shape[1]))
            #else:
            #    map_to_disk = sparse.hstack((map_to_disk, tempdata))
            #    map_to_disk = map_to_disk.tobsr()
            #    #map_to_disk.eliminate_zeros()
            #    #map_to_disk.prune()
            if y1 is None:
                y1=0
            y2 = tempdata.shape[0]+y1
            try:
                map_to_disk[y1:y2,] = tempdata
            except:
                counter+=1
            y1=y2
            del(tempdata)
            
        import math
        import ipdb; ipdb.set_trace()
        #sparse_mat = sparse.lil_matrix((map_to_disk.shape[1],map_to_disk.shape[1]))
        sparse_mat2 = sparse.lil_matrix(map_to_disk.T)
        sparse_mat = sparse.lil_matrix(map_to_disk)
        del(map_to_disk)
        comp.similarityVectors = sparse_mat

        #sparse_mat = sparse.dok_matrix(map_to_disk)
        import ipdb; ipdb.set_trace
        comp.similarityMatrix = sparse_mat.dot(sparse_mat2)
        #comp.similarityMatrix = np.dot(map_to_disk,map_to_disk.T)
        
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


