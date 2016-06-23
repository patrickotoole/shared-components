from gensim.models import Word2Vec
from gensim import similarities, corpora

class Word2VecComparision(object):

    def __init__(self,data):
        
        assert(type(data) == list)
        assert(len(data) > 0)
        assert(type(data[0]) == list)
        assert(len(data[0]) > 0)
        self.data = data
        self.joined_data = [" ".join(i) for i in self.data]
        self.build()

    def sentenceToVec(self,words):
        import numpy as np
        assert(len(words) > 0)
        count = 1
        words = filter(lambda x: x in self.dictionary_set,words)
        
        vec = self.model[words[0]]
        for word in words[1:]:
            vec = np.add(vec,self.model[word])
            count += 1
        return np.divide(vec, count)
    
    def build(self):
        import numpy as np
        self.model = model = Word2Vec(self.data,min_count=2)
        self.dictionary_set = set(self.model.index2word)
        self.sentenceVectors = np.array([self.sentenceToVec(l) for l in self.data])
        self.similarityVectors = np.array([self.normalize(vec) for vec in self.sentenceVectors])
        self.similarity = np.dot(self.similarityVectors,self.similarityVectors.T)
        #self.similarityVectors = np.array([self._compareVec(i,v) for i,v in enumerate(self.sentenceVectors)] )
        
    def normalize(self,vec):
        import numpy as np
        return vec/np.sqrt(np.sum(vec ** 2))
        
        
    def sentenceDot(self,v1,v2):
        from gensim import matutils
        from numpy import dot
        return dot(matutils.unitvec(v1), matutils.unitvec(v2))

    def compare(self,sentence):
        words = sentence.split()
        sentenceVec = self.sentenceToVec(words)
        return sorted(zip(self.joined_data,[self.sentenceDot(vec,sentenceVec) for vec in self.sentenceVectors]),key=lambda x: x[1],reverse=True)
