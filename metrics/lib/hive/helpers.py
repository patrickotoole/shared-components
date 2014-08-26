from lib.helpers import decorators

@decorators.deferred
@decorators.time_log
def run_hive_deferred(hive,q):
    return list(hive.execute(q))
 
@decorators.deferred
@decorators.time_log
def run_hive_session_deferred(hive,q_session):
    return list(hive.execute_session(q_session))
 
