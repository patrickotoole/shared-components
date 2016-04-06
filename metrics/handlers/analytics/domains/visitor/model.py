from __future__ import division
#import nltk
import os,sys
import math
import pickle
import collections # for dictionaries
#from nltk.corpus import brown
from collections import defaultdict
import pandas

def isInDictionary(word, unigrams):
    try: 
        if unigrams[word] == 0:
            return 0
        else:
            return 1
    except:
        return 0
    
def addToSet(sentence, unigrams, numWords): 
    sentence=sentence.lower()

    backpointer = [-1] * (len(sentence))
    values = [-1] * (len(sentence))
    valid = 0

    length = len(sentence)+1

    for i in range(1,length):
        if isInDictionary(sentence[:i], unigrams) == 1:
            if backpointer[i-1] == -1:
                values[i-1]=(unigrams[sentence[:i]])/numWords
                backpointer[i-1]=0
            else:
                if unigrams[sentence[:i]]/numWords >= values[i-1]:
                    values[i-1]= unigrams[sentence[:i]]/numWords
                    backpointer[i-1]=0
        if values[i-1] != -1:
            if i == len(sentence):
                valid = 1
            for j in range ((i+1),len(sentence)+1):
                if isInDictionary(sentence[i:j], unigrams):
                    if (abs((unigrams[sentence[i:j]]/numWords)*values[backpointer[i-1]])) >= values[j-1]:
                        values[j-1] = abs(((unigrams[sentence[i:j]]/numWords)*values[backpointer[i-1]]))
                        backpointer[j-1] = i
                if j == len(sentence)+1 and values[j-1] != -1:
                    valid = 1             

    sentList = list(sentence)
    check = backpointer[len(backpointer)-1]

    for k in range (len(backpointer)-1,1,-1):
        if k != check: 
            continue
        sentList.insert(k," ")
        check=backpointer[k-1]
    
    final = "".join(sentList)

    words = final.split()

    for word in words:
        if len(word)>2 and word not in ("com","net","org","these","those","http") and unigrams[word] < 8000:
            keywords.append(word)
    return keywords
