
class timeKeeper():
    def __init__(self):
        self.time = 0
    def getTime(self):
        return self.time
    def bumpTime(self, amount=1):
        self.time = self.time + amount
    def resetTime(self):
        self.time=0
