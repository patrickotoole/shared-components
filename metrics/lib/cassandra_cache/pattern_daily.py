import lib.cassandra_cache.pattern as cache

def run_daily(db):
    import pickle
    import work_queue
    from kazoo.client import KazooClient
    from pattern import run

    df = db.select_dataframe("select distinct url_pattern, pixel_source_name from pattern_cache") 
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    for i,row in df.iterrows():
        print row.pixel_source_name
        print row.url_pattern

        args = [row.pixel_source_name,row.url_pattern,1,1,True]
        work = (cache.run_force,args)

        work_queue.SingleQueue(zk,"python_queue").put(pickle.dumps(work),21)

if __name__ == "__main__":
    from link import lnk
    rb = lnk.dbs.rockerbox

    run_daily(rb)
