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

def genr(filename,find):
    import os
    stdin,stdout = os.popen2("tail -f %s " % (filename)) 

    while True:
        line = stdout.readline()
        yield line

def genr_time_batch(filename,find,find2,batch_time):
    import time
    g = genr(filename,find)
    while True:
        start_time = time.time()
        buf = []
        while True:
            buf.append(g.next())
            if start_time - time.time() < -batch_time:
                break

        with_users = len([i for i in buf if find2 in i ])
        if with_users:
            yield (1.0*len([i for i in buf if find in i]))/with_users
        else:
            pass

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("filename")
    parser.add_argument("find")
    parser.add_argument("find2")
    parser.add_argument("time")
    args = parser.parse_args()
    print args
    for i in genr_time_batch(args.filename,args.find,args.find2,int(args.time)):
        print i
