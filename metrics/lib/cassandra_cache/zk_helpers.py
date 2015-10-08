import datetime 

class ZKCacheHelpers(object):

    def __init__(self,zk,advertiser,pattern,identifier):

        self.zk = zk

        self._active_path = "/active_pattern_cache"
        self._complete_path = "/complete_pattern_cache"
        self._queue = "/python_queue"

        self.advertiser = advertiser
        self.pattern = pattern
        self.identifier = identifier

    @property
    def active_path(self):
        return "%s/%s=%s" % (self._active_path,self.advertiser,self.pattern)

    @property
    def complete_path(self):
        return "%s/%s=%s" % (self._complete_path,self.advertiser,self.pattern)

    def __enter__(self):

        # setup the heirarchy of paths to account for the active item
        self.zk.ensure_path(self._active_path)
        self.zk.ensure_path(self.active_path)
        self.zk.ensure_path(self.active_path + self.identifier)

    def __exit__(self, exc_type, exc_value, traceback):

        # destroy the active path reference
        self.zk.delete(self.active_path + self.identifier,recursive=True)
        if len(self.zk.get_children(self.active_path)) == 0:
            self.zk.delete(self.active_path, recursive=True)
        
        # add the completed path reference
        self.zk.ensure_path(self._complete_path)
        self.zk.create(self.complete_path)


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
            
        active = pandas.DataFrame(active_stats,columns=["index","identifier","date","advertiser","pattern"]).set_index("index")

        return active[active.pattern == self.pattern]

    def queue_stats(self):
        queued_pickle = [zk.get(self._queue + "/" + i) for i in self.zk.get_children(self._queue)]

        queued_items = []

        import pickle
        for pick,stats in queued_pickle:
            unpickled = pickle.loads(pick) 
            queued_items += [[str(unpickled[0]), datetime.datetime.fromtimestamp(stats.mtime/1000), unpickled[1], unpickled[1][0], unpickled[1][1]]]

        import pandas

        return pandas.DataFrame(queued_items,columns=["function","queue_date","params","advertiser","pattern"])

    def advertiser_queue_stats(self):
        df = self.queue_stats()
        return df[df['advertiser'] == self.advertiser]

    def pattern_queue_stats(self):
        df = self.advertiser_queue_stats()

        return df[df['pattern'] == self.pattern]

        


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
