import topic_runner_stream as trs

class BaseClassifier():
    
    def __init__(self, connectors={}):
        self.connectors = connectors

    def classify(self, url, title):
        return "No Topic"


class LSIClassifier(BaseClassifier):

    def __init__(self,csv_location, lsi_location):
        self.topic_streamer=trs.TopicStreamer(csv_location=csv_location,pickle_location=lsi_location)
        comp_obj, df = self.topic_streamer.load()
        self.topic_streamer.create_topic_vectors(comp_obj, df)

    def default_classifier(self,topic):
        return "No topic"

    def classifier(self,topic):
        return ""

    def classify(self, url, title):
        topic = self.topic_streamer.classify(url, title)
        return topic
            
