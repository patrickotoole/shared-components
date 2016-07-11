from link import lnk
from cache_runner_base import BaseRunner
import requests
import ujson

QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 500"
SIZEQUERY="select table_schema 'crushercache', data_length, index_length, data_free  FROM information_schema.TABLES GROUP BY table_schema"
SIZEQUERY = """SELECT table_schema "crushercache", sum( data_length + index_length ) / 1024 / 1024 "Data Base Size in MB", sum( data_free )/ 1024 / 1024 "Free Space in MB" FROM information_schema.TABLES GROUP BY table_schema """
class CacheCleanUp(BaseRunner):

    DAYS_AGO = 15

    def __init__(self, cc):
        self.crushercache =cc

    def run_query(self, table, colname):
        
        QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 5000"
    
        query = QUERY.format(table,colname, self.DAYS_AGO)
        self.crushercache.execute(query)
        
    def send_notification(self):
        df = self.crushercache.select_dataframe(SIZEQUERY)
        db_size = df.ix[0]['data base size in mb']
        db_free = df.ix[0]['free space in mb']
        url= "https://hooks.slack.com/services/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"
        text = "@channel: Cache cleaner ran, size of database: %s and free space in database: %s" % (db_size, db_free)
        requests.post(url, data=ujson.dumps({"text":text}))


def runner(crushercache):
    
    CCU = CacheCleanUp(crushercache)
    CCU.run_query("generic_function_cache", "date")
    CCU.send_notification()

if __name__ == "__main__":
    from link import lnk
    runner(lnk.dbs.crushercache)
