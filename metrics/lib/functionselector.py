import datetime
import ujson
from lib.zookeeper import CustomQueue
import pickle
import logging
import hashlib

class FunctionSelector():
    
    def select_function(self, udf):
        import lib.caching as custom_scripts
        from lib.cassandra_cache import run as cassandra_functions

        filtering_scripts = dir(custom_scripts)
        if udf in filtering_scripts:
            script = getattr(custom_scripts, udf)
            func = script.runner
        if udf in ('recurring','backfill'):
            filtering_scripts.append('recurring')
            filtering_scripts.append('backfill')
            func = cassandra_functions.run_recurring if udf == 'recurring' else cassandra_functions.run_backfill
        if udf not in filtering_scripts:
            import lib.caching.generic_udf_runner as runner
            func = runner.runner
        return func

