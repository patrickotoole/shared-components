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

    def load(self):
        import pickle
        import csv
        data = []
        with open(self.csv_location, "r") as topic_tsv:
            wr = csv.reader(topic_tsv, delimiter=",")
            for row in wr:
                data.append(row)
        df = pandas.DataFrame(data)
        columns_name = df.ix[0]
        df.columns = columns_name.to_dict().values()
        df = df.ix[1:]
        pickle_file = open(self.pickle_location, 'rb')
        comp_obj = pickle.load(pickle_file)

        return comp_obj,df
        

    def create_topic_vectors(self, comp_obj, df):
        import md5
        self.list_to_vector = comp_obj.sentenceToVec
        topic_vector_list = []
        list_of_topics = []
        for row in df.iterrows():
            topic = row[1]['topic']
            list_of_topics.append(topic)
        
        all_topics = set(list_of_topics)
        all_topics = list(all_topics)
        topic_list = [x.split(" ") for x in all_topics]
        self.topic_list =topic_list
        self.lookup_dict= {}
        for topic in topic_list:
            vector = comp_obj.sentenceToVec(topic)
            digest = md5.new(vector.tostring()).digest()
            self.lookup_dict[digest] = topic
            topic_vector_list.append(vector)
        self.topic_vectors = np.array(topic_vector_list)
        
        return topic_vector_list

    def lookup(self, vector):
        import md5
        digest = md5.new(vector.tostring()).digest()
        title_topic = self.lookup_dict[digest]
        return title_topic

    def get_similarity(self, vector):
        new_vector = np.square(vector)
        similar = np.sqrt(new_vector.sum())
        return similar

    def classify(self,url, title):
        title_list = title.split(" ")
        current_vector = self.list_to_vector(title_list)
        min_val = False
        vectr = np.array([])
        for i in range(0, self.topic_vectors.shape[0]):
            diff_vector = np.subtract(current_vector, self.topic_vectors[i])
            dist = self.get_similarity(diff_vector)
            if not min_val:
                min_val = dist
                vectr = self.topic_vectors[i]
            else:
                if dist < min_val:
                    min_val = dist
                    vectr = self.topic_vectors[i]
        topic = self.lookup(vectr)
        return topic



def runner(**kwargs):

    job_name = kwargs.get("job_id", "local_"+str(uuid.uuid4()))
    connectors = kwargs.get("connectors")
    parameters = kwargs.get("parameters",{})
    
    atr = TopicStreamer(connectors=connectors)

    comp_obj, df = atr.load()
    atr.create_topic_vectors(comp_obj, df)
    #import ipdb; ipdb.set_trace()
    #topic = atr.classify("fake.com","trump mexico") 

if __name__ == "__main__":
    connectors = TopicStreamer.get_connectors()
    runner(connectors=connectors)


