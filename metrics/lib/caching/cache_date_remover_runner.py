from link import lnk
from cache_runner_base import BaseRunner

QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 500"


class CacheCleanUp(BaseRunner):

    DAYS_AGO = 10

    def __init__(self, cc):
        self.crushercache =cc

    def runQuery(self, table, colname):
        if table == "domains_full_cache":
            QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 50000"
        elif table == "domains_full":
            QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 5000"
        elif table == "keyword_crusher_cache":
            QUERY= "delete from {} where UNIX_TIMESTAMP({}) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL {} DAY)) limit 5000"
    
        query = QUERY.format(table,colname, self.DAYS_AGO)
        self.crushercache.execute(query)
        


def runner(crushercache):
    
    CCU = CacheCleanUp(crushercache)
    CCU.runQuery("domains_cache", "record_date")
    CCU.runQuery("domains_full_cache", "record_date")
    CCU.runQuery("generic_function_cache", "date")
    CCU.runQuery("keyword_crusher_cache", "record_date")
    CCU.runQuery("uids_only_visits_cache", "date")
    CCU.runQuery("uids_only_sessions_cache", "date")

if __name__ == "__main__":
    from link import lnk
    import ipdb; ipdb.set_trace()
    runner(lnk.dbs.crushercache)
