import debug_parse, pandas
from multiprocessing import Pool, TimeoutError

def run_debug(args):
    try:
        debug = debug_parse.Debug(*args)
        debug.post()
        return pandas.Series(
            dict(debug.auction_result)).append(
            debug.bid_density()).append(
            pandas.Series({"auction_id":str(debug.original_auction)})
        )
    except:
        return pandas.Series([])

def run_wrapper(args):
    return run_debug(args)
    
class DebugMultiprocess(object):
    def __init__(self,size=20):
        self.pool = Pool(size)

    def run_pool(self,args):
        p = self.pool.map_async(run_wrapper,args)
        results = []
        try:
            try:
                results = p.get(timeout=5)
            except TimeoutError:
                print "timeout"
                pass
        except KeyboardInterrupt:
            print 'parent received control-c'
            return 
        return results
