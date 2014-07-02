from sys import stdin
import urlparse

class AuctionLine(object):

    def __init__(self,line):
        self._dict = self.__qsdict__(line[1])

    def get_qs(self):
        return self._dict
        
    def __qsdict__(self,qs=""):
        def param_helper(p):
            return p.split("?")[1] if "?" in p else p

        return {param_helper(i):j[0] for i,j in urlparse.parse_qs(qs).iteritems()}

    def __timefromstring__(self,s=""):
        try:
            return datetime.strptime(s,"%d/%b/%Y:%H:%M:%S").strftime("%Y-%m-%d %H:%M:%S")
        except:
            return 0

def StreamLoop(object):
		def __init__(self):
				pass

def genr(filename):
    import os
    stdin,stdout = os.popen2("tail -f %s" % filename) 

    while True:
        line = stdout.readline()
        sline = line.split(" ")
        aline = AuctionLine(sline)
        yield aline.get_qs()

def genr_time_batch(filename,batch_time):
    import time
    g = genr(filename)
    while True:
        start_time = time.time()
        buf = []
        while True:
            buf.append(g.next())
            if start_time - time.time() < -batch_time:
                break
        yield buf


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("filename")
    args = parser.parse_args()
    for i in genr_time_batch(args.filename,1):
        print i
