import topic_runner_stream_lda as lda

class BaseClassifier():
    
    def __init__(self, connectors={}):
        self.connectors = connectors

    def classify(self, url, title):
        return "No Topic"

class LDAClassifier(BaseClassifier):

    def __init__(self,lda_location, weight_cut):
        self.topic_streamer=lda.TopicStreamerLDA(pickle_location=lda_location, weight_cutoff=weight_cut)
        comp_obj = self.topic_streamer.load()

    def change_cutoff(self,weight):
        self.topic_streamer.change_cutoff(weight)

    def default_classifier(self,topic):
        return "No topic"

    def classifier(self,topic):
        return ""

    def classify(self, url, title):
        topic = self.topic_streamer.classify(url, title)
        return topic            
