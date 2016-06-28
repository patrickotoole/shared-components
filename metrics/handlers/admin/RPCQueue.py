import datetime
import ujson
from lib.zookeeper import CustomQueue
import pickle
import logging
import hashlib

class RPCQueue():

    def __init__(self, zookeeper=None, **kwargs):
        self.zookeeper = zookeeper

    
    def add_to_work_queue(self, rpc_object):
        rpc_data = ujson.loads(rpc_object)

        advertiser = rpc_data.get("advertiser")
        udf = rpc_data.get("udf")
        pattern = rpc_data.get("pattern")
        base_url = rpc_data.get("base_url", "http://beta.crusher.getrockerbox.com")
        segment = rpc_data.get("action_name", False)
        filter_id = rpc_data.get("filter_id", False)
        parameters = rpc_data.get("parameters", {})
        priority = rpc_data.get("priority", 2)
        
        volume = "v{}".format(datetime.datetime.now().strftime('%m%y'))
        if udf in ('recurring','backfill'):
            import lib.cassandra_cache.run as cassandra_functions
            yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
            _cache_yesterday = datetime.datetime.strftime(yesterday, "%Y-%m-%d")
            fn = cassandra_functions.run_recurring if udf == 'recurring' else cassandra_functions.run_backfill
            recur_kwargs = {"advertiser":advertiser, "pattern":pattern, "cache_date":_cache_yesterday, "indentifier":"recurring_cassandra_cache"}
            backfill_kwargs = {"advertiser":advertiser, "pattern":pattern, "cache_date":_cache_yesterday, "indentifier":"backfill_cassandra"}
            kwargs = recur_kwargs if udf == 'recurring' else backfill_kwargs
            work = pickle.dumps((
                fn,
                kwargs
                ))
        else:
            import lib.caching.generic_udf_runner as runner
            work = pickle.dumps((
                runner.runner,
                {"advertiser":advertiser, "pattern":pattern, "func_name":udf, "base_url":base_url, "identifiers":"udf_{}_cache".format(udf), "filter_id":filter_id}
                ))
        priority = int(priority)
        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work,priority)
        logging.info("added to Cassandra work queue %s for %s" %(segment,advertiser))
        job_id = hashlib.md5(work).hexdigest()
        return entry_id, job_id

