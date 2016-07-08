from link import lnk
from cache_runner_base import BaseRunner


QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 500"

class CacheCleanUp(BaseRunner):

    DAYS_AGO = 15

    def __init__(self, cc):
        self.crushercache =cc

    def runQuery(self, table, colname):
        
        QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 5000"
    
        query = QUERY.format(table,colname, self.DAYS_AGO)
        self.crushercache.execute(query)
        


def runner(crushercache):
    
    CCU = CacheCleanUp(crushercache)
    CCU.runQuery("generic_function_cache", "date")

if __name__ == "__main__":
    from link import lnk
    runner(lnk.dbs.crushercache)
