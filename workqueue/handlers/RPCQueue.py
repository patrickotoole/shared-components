import datetime
import ujson
import pickle
import logging
import hashlib
import lib.execution.build
from lib.functionselector import FunctionSelector

SELECT_UDFS = "select name from rpc_function_details where is_recurring=1"
SELECT_SCRIPTS = "select script from workqueue_scripts where name = '%s' and active = 1 and deleted=0"

def custom_script(**kwargs):
    # i think this is going to change to use my execution environment
    connectors = kwargs.get("connectors")
    cc = connectors['crushercache']
    udf = kwargs['udf']
    log_obj = kwargs.get('log_object',False)
    env = lib.execution.build.build_execution_env_from_db(cc, log_object=log_obj)

    try:
        env.run(udf,kwargs.get("params",{}))
        return True
    except: return False

class RPCQueue():

    def __init__(self, crushercache=None, zk_wrapper=None, **kwargs):
        self.crushercache = crushercache
        self.zk_wrapper = zk_wrapper

    def add_advertiser_to_wq(self, rpc_object):
        import lib.caching.fill_cassandra as fc
        import lib.caching.udf_base as ub
        
        rpc_data = ujson.loads(rpc_object)
        advertiser = rpc_data.get("advertiser")
        set_debug = rpc_data.get("debug",None)
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
        entry_id = self.zk_wrapper.write(work1,2,set_debug)
        logging.info("added udf base runner to work queue for %s" %(advertiser))
        job_id = hashlib.md5(work1).hexdigest()

        entry_id = self.zk_wrapper.write(work2,2,set_debug)
        logging.info("added fill cassandra to  work queue for %s" %(advertiser))
        job_id = hashlib.md5(work2).hexdigest()
        logging.info("Added job id %s to wq, running recache for entire advertiser" % job_id)
        return entry_id, job_id
    
    def add_to_work_queue(self, rpc_object):
        import lib.caching as custom_scripts
        rpc_data = ujson.loads(rpc_object)
        logging.info("Adding to work queue %s" % rpc_data)
        advertiser = rpc_data.get("advertiser")
        udf = rpc_data.get("udf")
        pattern = rpc_data.get("pattern")
        base_url = rpc_data.get("base_url", "http://beta.crusher.getrockerbox.com")
        segment = rpc_data.get("action_name", False)
        filter_id = rpc_data.get("filter_id", False)
        parameters = ujson.loads(rpc_object)
        priority = rpc_data.get("priority", 2)
        debug_bool = rpc_data.get("debug",None)
        
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
            #kwargs['code'] = code_string
            kwargs['udf'] = udf
            kwargs['params'] = parameters
            work = pickle.dumps((fn, kwargs))
            priority = 1

        entry_id = self.zk_wrapper.write(work,priority,debug_bool)
        logging.info("added to Cassandra work queue %s for %s" %(segment,advertiser))
        job_id = hashlib.md5(work).hexdigest()
        function_name = kwargs.get('func_name', False) or kwargs.get('udf', 'NA')
        self.crushercache.execute("insert into cache_add (job_id, function, params) values (%s, %s, %s)" , (job_id, function_name, ujson.dumps(kwargs)))
        logging.info("Added job id %s to wq with priority %s" % (job_id, priority))
        return entry_id, job_id

