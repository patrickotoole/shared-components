from lib.caching.cache_runner_base import BaseRunner

import pandas
import logging
import uuid
import numpy as np
import logging
import sys

class TopicStreamer(BaseRunner):

    def __init__(self, csv_location="rec_df.csv", pickle_location='LSImodelobject.p', connectors={}):
        self.csv_location = csv_location
        self.pickle_location = pickle_location
        self.connectors = connectors
        self.topic_vectors = []
        self.list_to_vector = False
        self.comp = self.load()

    def load(self):
        import pickle
        pickle_file = open(self.pickle_location, 'rb')
        comp_obj = pickle.load(pickle_file)

        return comp_obj
        

    def title_to_doc(self,title)
        as_doc = self.comp.dictionary.doc2bow(title)
        return as_doc

    def process_lda(self,doc):
        lda_topic = self.comp.lda_model[doc]
        lda_topic.sort()
        highest_prob_topic = lda_topic[0]
        topic_equation_as_string = self.comp.lda_model.print_topic(highest_prob_topic[0]
        topics_list = topic_as_string.split("+")
        topic_word_list = []
        for word in topics_list:
            word_prob = word.split("*")
            word_weight = float(word_prob[0])
            word_num = int(word_prob)
            if word_wieght > 0.1:
                word_from_num = self.comp.dictionary.get(word_num)
                topic_word_list.append(word_from_num)
        return "-".join(topic_word_list)

    def classify(self,url, title):
        title_list = title.split(" ")
        as_doc = self.title_to_doc(title_list)
        topic = self.process_lda(as_doc)
        
        return topic



def runner(**kwargs):

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters",{})
    
    atr = TopicStreamer(connectors=connectors)

    atr.create_topic_vectors(comp_obj, df)
    #import ipdb; ipdb.set_trace()
    #topic = atr.classify("fake.com","trump mexico") 

if __name__ == "__main__":
    connectors = TopicStreamer.get_connectors()
    runner(connectors=connectors)


