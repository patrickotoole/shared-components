from gensim.models import LsiModel
from gensim import similarities, corpora
import zlib
import codecs 
import numpy

class LSIComparision(object):

    def __init__(self,data, build=True, num_topics=500):
        if build: 
            assert(type(data) == list)
            assert(len(data) > 0)
            assert(type(data[0]) == list)
            assert(len(data[0]) > 0)
            self.data = data
            self.num_topics = int(num_topics)
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
        from collections import Counter
        count = Counter()
        for i in self.data:
            if "&utm" not in i:
                count.update(i)
        corpus = count
        #self.model = LsiModel(self.corpus,onepass=False,power_iters=5,id2word=self.dictionary)
        #corp = self.model[self.corpus]

        import gensim.models.ldamodel as lda
        self.lda_model = lda.LdaModel(self.corpus, num_topics=self.num_topics)

        self.topics = {}
        for item in self.data:
            try:
                result = self.lda_model[self.dictionary.doc2bow(item)]
                result.sort()
                if len(result)>0:
                    self.topics["-".join(item)] = result[0]
            except Exception as e:
                 print str(e)
            

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
        vec_lda = self.lda_model[vec_bow]
        
        #sims = self.similarity[vec_lda]
        sims = vec_lda
        #sims = sorted(enumerate(sims), key=lambda item: -item[1])
        return [(" ".join(self.data[i[0]]),i[1]) for i in sims if i[1] > threshold]
