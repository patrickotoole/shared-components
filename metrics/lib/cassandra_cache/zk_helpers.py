import datetime 
import pandas
import time

class ZKCacheHelpers(object):
    """
    This is a collection of helpers to be used with the ZKCache runner. 

    It provides two main pieces of functionality (which later should be split):
      - a with block for running a job. this handles the proper setup and tear-down of the class
      - stats functions for pulling information about the queued cache

    """


    def __init__(self,zk,advertiser,pattern,identifier):

        self.zk = zk

        self._active_path = "/active_pattern_cache"
        self._complete_path = "/complete_pattern_cache"
        self._queue = "/python_queue"

        self.advertiser = advertiser
        self.pattern = pattern
        self.identifier = identifier

        self._start = time.time()

    def add_work(self,work):
        self.zk.ensure_path(self._queue)
        self.zk.ensure_path("%s/%s=%s" % (self._queue,self.advertiser,self.pattern))

        self.zk.create(identifier,work)
 

    @property
    def active_path(self):
        return "%s/%s=%s" % (self._active_path,self.advertiser,self.pattern)

    @property
    def complete_path(self):
        return "%s/%s=%s" % (self._complete_path,self.advertiser,self.pattern)

    def destroy_active(self):
        self.zk.delete(self.active_path + "/" + str(self.identifier),recursive=True)

    def __enter__(self):

        # setup the heirarchy of paths to account for the active item
        self.zk.ensure_path(self._active_path)
        self.zk.ensure_path(self.active_path)
        self.zk.ensure_path(self.active_path + "/" + self.identifier)

    def __exit__(self, exc_type, exc_value, traceback):

        # destroy the active path reference
        self.zk.delete(self.active_path + "/" + self.identifier,recursive=True)
        if len(self.zk.get_children(self.active_path)) == 0:
            self.zk.delete(self.active_path, recursive=True)
        
        # add the completed path reference
        self.zk.ensure_path(self._complete_path)
        self.zk.ensure_path(self.complete_path)
        self.zk.ensure_path(self.complete_path + "/" + self.identifier)


    def stats(self):
        active = self.zk.get_children(self._active_path)
        active_items = {a: len(self.zk.get_children(self._active_path + "/" + a)) for a in active}

        complete = self.zk.get_children(self._complete_path)
        complete_items = {a: len(self.zk.get_children(self._complete_path + "/" + a)) for a in complete}

        import pandas

        df = pandas.DataFrame({"active":pandas.Series(active_items), "complete":pandas.Series(complete_items)})
        df['advertiser'] = df.index.map(lambda x: x.split("=")[0])
        df['pattern'] = df.index.map(lambda x: x.split("=")[1])
        return df

    def advertiser_stats(self):
        df = self.stats()
        advertiser_df = df[df['advertiser'] == self.advertiser]

        advertiser_df['active_date'] = 0
        advertiser_df['complete_date'] = 0


        for i,row in advertiser_df.iterrows():
            ap = self.zk.get(self._active_path + "/" + i)
            cp = self.zk.get(self._complete_path + "/" + i)

            ats = datetime.datetime.fromtimestamp(ap[1].mtime/1000)
            cts = datetime.datetime.fromtimestamp(cp[1].mtime/1000)

            advertiser_df.ix[i,'active_date'] = ats
            advertiser_df.ix[i,'complete_date'] = cts


        return advertiser_df

    def active_stats(self):
        df = self.stats()
        advertiser_df = df[df['advertiser'] == self.advertiser]

        active_df = advertiser_df[advertiser_df['active'] > 0]
        active_element_paths = [
            (i,j,self._active_path + "/" + i + "/" + j) 
            for i,row in active_df.iterrows() 
            for j in self.zk.get_children(self._active_path + "/" + i)
        ]

        active_stats = []

        for i,j,path in active_element_paths:
            ap = self.zk.get(path)
            ts = datetime.datetime.fromtimestamp(ap[1].mtime/1000)
            active_stats += [(i,j,ts,i.split("=")[0],i.split("=")[1])]

        import pandas
        if len(active_stats):
            cols = ["index","identifier","date","advertiser","pattern"]
            active = pandas.DataFrame(active_stats,columns=cols).set_index("index")

            return active[active.pattern == self.pattern]
        else:
            return pandas.DataFrame([])

    def get_queued(self,name):
        v1, v2 = self.zk.get(self._queue + "/" + name)
        return name, v1, v2

    def queue_stats(self):
        queued_pickle = [self.get_queued(i) for i in self.zk.get_children(self._queue)]
        queued_items = []

        import pickle, pandas

        for name,pick,stats in queued_pickle:
            unpickled = pickle.loads(pick) 
            ts = datetime.datetime.fromtimestamp(stats.mtime/1000)
            queued_items += [[name,str(unpickled[0]), ts, unpickled[1], unpickled[1][0], unpickled[1][1]]]

        try:
            assert(len(queued_items) > 0)
            cols = ["name","function","queue_date","params","advertiser","pattern"]
            return pandas.DataFrame(queued_items,columns=cols)
        except:
            return pandas.DataFrame([])

    def advertiser_queue_stats(self):
        df = self.queue_stats()
        try:
            assert(len(df) > 0)
            return df[df['advertiser'] == self.advertiser]
        except:
            return pandas.DataFrame([])

    def pattern_queue_stats(self):
        df = self.advertiser_queue_stats()
        try:
            assert(len(df) > 0)
            return df[df['pattern'] == self.pattern]
        except:
            return pandas.DataFrame([])

        


if __name__ == "__main__":
    from kazoo.client import KazooClient

    zk = KazooClient(hosts="zk1:2181")
    zk.start()
    zk_helper = ZKCacheHelpers(zk,"baublebar","rings","")
    print zk_helper.stats().head()
    print zk_helper.advertiser_stats()
    print zk_helper.active_stats()
    print zk_helper.queue_stats()
    print zk_helper.pattern_queue_stats()
