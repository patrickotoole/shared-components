import logging
from run import run_backfill

formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates



if __name__ == "__main__":
    import sys, time
    from kazoo.client import KazooClient
    from link import lnk
    start = time.time()
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    logging.info("Parameters: %s" % str(sys.argv))

    advertiser, days = sys.argv[1:]
    connectors = {
        "zk": zk,
        "db": lnk.dbs.rockerbox,
        "cassandra": lnk.dbs.cassandra 
    }
    SELECT = "SELECT pixel_source_name as advertiser, url_pattern as pattern from action_with_patterns"
    df = connectors['db'].select_dataframe(SELECT + " where pixel_source_name = '%s'" % advertiser)

    
    dates = build_datelist(int(days))

    for i in df.iterrows():
        for date in dates:
            _d = i[1].to_dict()
            try:
                run_backfill(_d['advertiser'], _d['pattern'], date, connectors=connectors)
            except:
                logging.info("HERE")

 


    logging.info("Elapsed:  %s " % (time.time() - start))
