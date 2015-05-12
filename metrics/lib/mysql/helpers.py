from lib.helpers import decorators

@decorators.deferred
@decorators.time_log
def run_mysql_deferred(mysql, q):
    return mysql.select_dataframe(q)

@decorators.deferred
@decorators.time_log
def execute_mysql_deferred(mysql, q):
    return mysql.execute(q)
