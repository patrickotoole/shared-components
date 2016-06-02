class MetricCounter:
    def __init__(self):
        self.success = 0
        self.error = 0
        self.dequeue = 0

    def bumpSuccess(self):
        self.success = self.success+1

    def bumpError(self):
        self.error = self.error + 1

    def bumpDequeue(self):
        self.dequeue = self.dequeue+1

    def getSuccess(self):
        return self.success

    def getError(self):
        return self.error

    def getDequeue(self):
        return self.dequeue
