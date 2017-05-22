from link import lnk
import pandas
from cassandra.query import SimpleStatement

SELECTQUERY = "select distinct uid from uid_test"

INSERTBATCH = "insert into test (uid, full_url, domain, time) value "
BASE = "('%s', '%s', '%s', '%s')"
Q = "SELECT * from rockerbox.visitor_domains_full where uid = '%s'"

class PopulatePrototypeOffsite:

    def __init__(self, cassandra, prototype):
        self.cassandra = cassandra
        self.prototype = prototype

    def process_cassandra_statement(self, statement):
        data = []
        for user_row in self.cassandra.execute(statement):
            values_temp = BASE % (user_row['uid'], user_row['url'].replace(",","").replace("'","").replace('"',""), user_row['domain'], user_row['timestamp'])
            data.append(values_temp)
        return data

    def pull_cass(self, uids):
        for uid in uids:
            try:
                query = Q % (str(uid))
                statement = SimpleStatement(query, fetch_size=1000)
                data = self.process_cassandra_statement(statement)
                QUERY = INSERTBATCH + ",".join(data)
                self.prototype.execute(QUERY)
            except Exception as e:
                print str(e)

    def run_uids(self):
        df = self.prototype.select_dataframe(SELECTQUERY)
        uids_tuple = tuple(df.uid.apply(lambda x: str(x)).tolist())
        return uids_tuple



if __name__ == "__main__":

    from link import lnk
    cass = lnk.dbs.cassandra
    proto = lnk.dbs.prototype
    ppo = PopulatePrototypeOffsite(cass,proto)
    uids = ppo.run_uids()
    ppo.pull_cass(uids)

