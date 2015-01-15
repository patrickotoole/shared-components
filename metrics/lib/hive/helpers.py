from lib.helpers import decorators

@decorators.deferred
@decorators.time_log
def run_hive_deferred(hive,q):
    return list(hive.execute(q))
 
@decorators.deferred
@decorators.time_log
def run_hive_session_deferred(hive,q_session):
    return list(hive.session_execute(q_session)) 

@decorators.deferred
@decorators.time_log
def run_spark_sql_deferred(spark_sql,q):
    return list(spark_sql.execute(q))

@decorators.deferred
@decorators.time_log
def run_spark_sql_session_deferred(spark_sql,q_session):
    return spark_sql.session_execute(q_session)
