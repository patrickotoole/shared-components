from gensim.models import LsiModel
from gensim import similarities, corpora
import zlib
import codecs 
import numpy

class LSIComparision(object):

    def __init__(self,data, build=True):
        if build: 
            assert(type(data) == list)
            assert(len(data) > 0)
            assert(type(data[0]) == list)
            assert(len(data[0]) > 0)
            self.data = data
            self.data_dict = {}
            self.subsize = (len(data) / 1000) + 1
            self.divide_data(data)
            self.build()
        else:
            self.data = data
            self.sub_build()
    
    def divide_data(self,data):
        for i in range(0,self.subsize):
            x = i*500
            y = (i+1)*500
            self.data_dict[i] = data[x:y]

    def sub_build(self):
        import numpy as np
        self.dictionary = corpora.Dictionary(self.data)
        self.corpus = [self.dictionary.doc2bow(text) for text in self.data]
        self.model = LsiModel(self.corpus,onepass=False,power_iters=5,id2word=self.dictionary)
        print "finished model"
        corp = self.model[self.corpus]
        self.similarity = similarities.MatrixSimilarity(corp)

    def build(self):
        #FILTER STEP
        import numpy as np
        self.dictionary = corpora.Dictionary(self.data)
        self.dictionary.filter_extremes()
        self.corpus = [self.dictionary.doc2bow(text) for text in self.data]

        #import ipdb; ipdb.set_trace()
        self.model = LsiModel(self.corpus,onepass=False,power_iters=5,id2word=self.dictionary)
        print "finished model"
        corp = self.model[self.corpus]
        self.similarity = similarities.MatrixSimilarity(corp)
        #from scipy import sparse
        #sparse_mat = sparse.dok_matrix((len(self.data),len(self.data)))
        del(self.data_dict)
        self.data = [self.sentenceToVecLimit(l) for l in self.data]
        self.data = [x for x in self.data if x is not None]

        #BUILD STEP
        self.dictionary = corpora.Dictionary(self.data)
        self.corpus = [self.dictionary.doc2bow(text) for text in self.data]
        self.model = LsiModel(self.corpus,onepass=False,power_iters=5,id2word=self.dictionary)
        corp = self.model[self.corpus]
        self.similarity = similarities.MatrixSimilarity(corp)
        print len(self.data)
        self.similarityVectors = np.array([self.sentenceToVec(l) for l in self.data])
        #import ipdb; ipdb.set_trace()
        #for i in range(0,self.subsize):
        #    print i
        #    temp = np.array([self.sentenceToVec(l) for l in self.data_dict[i]])
        #    for x in range(0,temp.shape[0]):
        #        if np.square(temp[x,:]).sum()>950:
        #            for y in range(0,temp.shape[1]):
        #                sparse_mat[x,y] = temp[x,y]
        #    del(self.data_dict[i])
        #    del(temp)

        #self.similarityVectors1 = np.array([self.sentenceToVec(l) for l in d2])
        #sv1 = self.compress(self.similarityVectors1)
        #import ipdb; ipdb.set_trace()
        #self.similarityVectors = np.array([self.sentenceToVec(l) for l in self.data])
        #self.similarityVectors = np.array([self.normalize(vec) for vec in self.similarityVectors])
        #self.similarityMatrix = np.dot(self.similarityVectors,self.similarityVectors.T)

        
    def normalize(self,vec):
        import numpy as np
        return vec/np.sqrt(np.sum(vec ** 2))
        
    def sentenceToVecLimit(self,words):
        #import ipdb; ipdb.set_trace()
        vec_bow = self.dictionary.doc2bow(words)
        vec_lsi = self.model[vec_bow]
        sims = self.similarity[vec_lsi]
        if sims.sum() > 1750:
            return words

    def sentenceToVec(self,words):
        #import ipdb; ipdb.set_trace()
        vec_bow = self.dictionary.doc2bow(words)
        vec_lsi = self.model[vec_bow]
        sims = self.similarity[vec_lsi]
        return sims
        
    
    def compare(self,similarity_string,threshold=0.9):
        SIMILAR_TO = similarity_string
        vec_bow = self.dictionary.doc2bow(SIMILAR_TO.split())
        vec_lsi = self.model[vec_bow]
        
        sims = self.similarity[vec_lsi]
        sims = sorted(enumerate(sims), key=lambda item: -item[1])
        return [(" ".join(self.data[i[0]]),i[1]) for i in sims if i[1] > threshold]
