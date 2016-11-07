import datetime
import ujson
from lib.zookeeper import CustomQueue
import pickle
import logging
import hashlib
from lib.functionselector import FunctionSelector

SELECT_UDFS = "select name from rpc_function_details where is_recurring=1"
SELECT_SCRIPTS = "select script from workqueue_scripts where name = '%s' and active = 1 and deleted=0"

def custom_script(**kwargs):
    result = False
    code_string = kwargs.get('code', Exception("no code arguement passed to custom script"))
    code = compile(code_string, '<string>','exec')
    try:
        exec code in {"params":kwargs['params']}
        result = True
    except:
        result = False
    return result

class RPCQueue():

    def __init__(self, zookeeper=None, crushercache=None, **kwargs):
        self.crushercache = crushercache
        self.zookeeper = zookeeper

    def add_advertiser_to_wq(self, rpc_object):
        import lib.caching.fill_cassandra as fc
        import lib.caching.udf_base as ub
        
        rpc_data = ujson.loads(rpc_object)
        advertiser = rpc_data.get("advertiser")
        if rpc_data.get("debug",""):
            if rpc_data.get("debug","") == "true" or rpc_data.get("debug","") =="True":
                set_debug=True
        else:
            set_debug = False
        fn1 = ub.runner
        fn2 = fc.runner
        
        udfs_from_db = self.crushercache.select_dataframe(SELECT_UDFS)
        udfs = []
        for udf in udfs_from_db.iterrows():
            udfs.append(udf[1]['name'])

        kwargs1 = {}
        kwargs1["advertiser"]=advertiser
        kwargs1["pattern"]=False
        kwargs1["onqueue"]=True
        kwargs1['udfs'] = udfs
        kwargs1['base_url'] = "http://beta.crusher.getrockerbox.com"
        kwargs1['parameters'] = {}
        kwargs1['debug']=set_debug

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
        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work1,2,debug=set_debug)
        logging.info("added udf base runner to work queue for %s" %(advertiser))
        job_id = hashlib.md5(work1).hexdigest()

        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work2,2,debug=set_debug)
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
        
        #Overwrite for custom scripting
        script_df = self.crushercache.select_dataframe(SELECT_SCRIPTS % udf)
        if len(script_df) > 0:
            code_string = script_df.ix[0]['script']
            fn =  custom_script
            kwargs={}
            kwargs['advertiser']='rockerbox'
            kwargs['code'] = code_string
            kwargs['params'] = parameters
            work = pickle.dumps((fn, kwargs))
            priority = 1
            debug_bool=True

        entry_id = CustomQueue.CustomQueue(self.zookeeper,"python_queue","log",volume).put(work,priority,debug=debug_bool)
        logging.info("added to Cassandra work queue %s for %s" %(segment,advertiser))
        job_id = hashlib.md5(work).hexdigest()
        return entry_id, job_id

