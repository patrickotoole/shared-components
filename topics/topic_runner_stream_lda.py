from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid
import numpy as np
import logging
import sys

class TopicStreamerLDA(BaseRunner):

    def __init__(self, csv_location="rec_df.csv", pickle_location='LSImodelobject.p', weight_cutoff=0.2, connectors={}):
        self.csv_location = csv_location
        self.pickle_location = pickle_location
        self.cutoff = weight_cutoff
        self.connectors = connectors
        self.topic_vectors = []
        self.list_to_vector = False
        self.comp = self.load()

    def load(self):
        import pickle
        pickle_file = open(self.pickle_location, 'rb')
        comp_obj = pickle.load(pickle_file)

        return comp_obj
        
    def change_cutoff(self,weight):
        self.cutoff = weight

    def title_to_doc(self,title):
        title_lower = [x.lower() for x in title]
        as_doc = self.comp.dictionary.doc2bow(title_lower)
        return as_doc

    def process_lda(self,doc):
        lda_topic = self.comp.lda_model[doc]
        lda_topic.sort()
        if lda_topic ==[]:
            return "No Topic"
        highest_prob_topic = lda_topic[0]
        topic_equation_as_string = self.comp.lda_model.print_topic(highest_prob_topic[0])
        topics_list = topic_equation_as_string.split("+")
        topic_word_list = []
        for word in topics_list:
            word_prob = word.split("*")
            word_weight = float(word_prob[0])
            word_num = int(word_prob[1])
            if word_weight > self.cutoff:
                word_from_num = self.comp.dictionary.get(word_num)
                topic_word_list.append(word_from_num)
        return "-".join(topic_word_list)

    def classify(self,url, title):
        if title != 'No title' and title != "No Title" and title != "no title":
            title_list = title.split(" ")
            as_doc = self.title_to_doc(title_list)
            topic = self.process_lda(as_doc)
        else:
            url_to_title = url.lower()
            url_without = url_to_title.replace("http://","")
            dd = url_without.split(".com")
            dd = dd[1] if len(dd) > 1 else dd[0]
            dd = dd.split(".net")
            dd = dd[1] if len(dd) > 1 else dd[0]
            dd = dd.split("?")[0]
            dd = dd[1:] if dd.startswith("/") else dd
            dd = dd[:-1] if dd.endswith("/") else dd
            last = dd.split("/")[-1]
            title_list = [k for j in last.split("-") for k in j.split("_")]
            as_doc = self.title_to_doc(title_list)
            if as_doc != []:
                topic = self.process_lda(as_doc)
            else:
                topic = "No topic"
        return topic



def runner(**kwargs):

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters",{})
    
    atr = TopicStreamerLDA(connectors=connectors)

    atr.create_topic_vectors(comp_obj, df)
    #import ipdb; ipdb.set_trace()
    #topic = atr.classify("fake.com","trump mexico") 

if __name__ == "__main__":
    connectors = TopicStreamerLDA.get_connectors()
    runner(connectors=connectors)


