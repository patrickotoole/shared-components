

class BaseClassifier():
    
    def __init__(self, connectors={}):
        self.connectors = connectors

    def classify(self, url, title):
        return "No Topic"


class LSIClassifier(BaseClassifier):

    def __init__(self):
        self.use_default = True

    def default_classifier(self,topic):
        return "No topic"

    def classifier(self,topic):
        return ""

    def classify(self, url, title):
        topic = self.topic_streamer.classify(url, title)
        return topic
            
