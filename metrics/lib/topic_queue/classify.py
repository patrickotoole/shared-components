

class Classifier():

    def __init__(self):
        self.use_default = True

    def default_classifier(self,topic):
        return "No topic"

    def classifier(self,topic):
        return ""

    def classify(self, topic):
        if self.use_default:
            topic = self.default_classifier(topic)
        else:
            topic = self.classifier(topic)
        return topic
            
