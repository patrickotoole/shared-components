import datetime
import ujson
from lib.zookeeper import CustomQueue
import pickle
import logging
import hashlib
from lib.functionselector import FunctionSelector

class RPCQueue():

    def __init__(self, zookeeper=None, **kwargs):
        self.zookeeper = zookeeper

    def add_advertiser_to_wq(self, rpc_object):
        import lib.caching.fill_cassandra as fc
        import lib.caching.udf_base as ub

        rpc_data = ujson.loads(rpc_object)
        advertiser = rpc_data.get("advertiser")
        fn1 = ub.runner
        fn2 = fc.runner
        
        kwargs1 = {}
        kwargs1["advertiser"]=advertiser
        kwargs1["pattern"]=False
        kwargs1["onqueue"]=True
        kwargs1['udfs'] =['domains', 'domains_full', 'before_and_after', 'model', 'hourly','sessions']
        kwargs1['base_url'] = "http://beta.crusher.getrockerbox.com"
        kwargs1['parameters'] = {}
        kwargs1['debug']=False

        kwargs2 = {}
        kwargs2['advertiser'] = advertiser
        
        work1 = pickle.dumps((
            fn1,
            kwargs1
            ))

        work2 = pickle.dumps((
            fn2,
            kwargs2
            ))

        volume = "v{}".format(datetime.datetime.now().strftime('%m%y'))
        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work1,2,debug=False)
        logging.info("added udf base runner to work queue for %s" %(advertiser))
        job_id = hashlib.md5(work1).hexdigest()

        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work2,2,debug=False)
        logging.info("added fill cassandra to  work queue for %s" %(advertiser))
        job_id = hashlib.md5(work2).hexdigest()

        return entry_id, job_id
    
    def add_to_work_queue(self, rpc_object):
        import lib.caching as custom_scripts

        rpc_data = ujson.loads(rpc_object)

        advertiser = rpc_data.get("advertiser")
        udf = rpc_data.get("udf")
        pattern = rpc_data.get("pattern")
        base_url = rpc_data.get("base_url", "http://beta.crusher.getrockerbox.com")
        segment = rpc_data.get("action_name", False)
        filter_id = rpc_data.get("filter_id", False)
        parameters = rpc_data.get("parameters", {})
        priority = rpc_data.get("priority", 2)
        debug_bool = rpc_data.get("debug",False)
        for key, val in rpc_data.items():
            if key not in ['advertiser','udf','pattern','base_url','action_name','filter_id','priority','parameters', 'debug']:
                parameters[key] = val
        
        volume = "v{}".format(datetime.datetime.now().strftime('%m%y'))
        if udf in ('recurring','backfill'):
            days_ago = 1
            if 'days_ago' in parameters.keys():
                days_ago = int(parameters['days_ago'])
            yesterday = datetime.datetime.now() - datetime.timedelta(days=days_ago)
            _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
            recur_kwargs = {"advertiser":advertiser, "pattern":pattern, "cache_date":_cache_yesterday, "identifier":"recurring_cassandra_cache"}
            backfill_kwargs = {"advertiser":advertiser, "pattern":pattern, "cache_date":_cache_yesterday, "identifier":"backfill_cassandra"}
            kwargs = recur_kwargs if udf == 'recurring' else backfill_kwargs
        else:
            kwargs = {"advertiser":advertiser, "pattern":pattern, "func_name":udf, "base_url":base_url, "identifiers":"udf_{}_cache".format(udf), "filter_id":filter_id, "parameters":parameters}

        filtering_scripts = dir(custom_scripts) 
        if udf in filtering_scripts:
            kwargs = dict(kwargs.items()+parameters.items())
            kwargs.pop('parameters')
            #need better documentation and clarity on script and udf input for RPC
        FS = FunctionSelector()
        fn = FS.select_function(udf)
        work = pickle.dumps((
            fn,
            kwargs
            ))
        priority = int(priority)
        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work,priority,debug=debug_bool)
        logging.info("added to Cassandra work queue %s for %s" %(segment,advertiser))
        job_id = hashlib.md5(work).hexdigest()
        return entry_id, job_id

