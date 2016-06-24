from link import lnk
from kazoo.client import KazooClient
import logging
from cache_runner_base import BaseRunner

QUERY = "select advertiser, pattern, filter_id from batch_job_errors_today group by advertiser, pattern"
QUERY1 = "select advertiser, pattern, filter_id from batch_job_errors_today group by advertiser, pattern having advertiser='{}'"
SETQUERY = "update action set ToDelete='yes' where pixel_source_name=%s and action_id=%s"

class SetToRemove(BaseRunner):

    def __init__(self, connectors):
        self.connectors = connectors

    def get_segs(self):
        df = self.connectors['crushercache'].select_dataframe(QUERY)
        return df

    def set_to_del(self, crusher, pattern):
        _resp = crusher.get('/crusher/pattern_search/timeseries_only?search={}'.format(pattern))
        data = _resp.json
        data_list = data['results']
        has_data = False
        for item in data_list:
            if item['views'] >0:
                has_data = True
            if has_data:
                break
        return has_data

    def set_pattern_to_delete(self,advertiser, filter_id):
        self.connectors['db'].execute(SETQUERY, (advertiser, int(filter_id)))
        return True

    def runner(self):
        df = self.get_segs()
        for row in df.iterrows():
            crusher = self.get_crusher_obj(row[1]['advertiser'], "http://192.168.99.100:8888")
            has_data  = self.set_to_del(crusher, row[1]['pattern'])
            if not has_data:
                    self.set_pattern_to_delete(row[1]['advertiser'], row[1]['filter_id'])
                    logging.info("deleted %s from %s" % (row[1]['pattern'], row[1]['advertiser']))

if __name__ == "__main__":
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    connectors = {'db': lnk.dbs.rockerbox, 'crushercache':lnk.dbs.crushercache}#, 'zk':zk, 'cassandra':''}
    rem = SetToRemove(connectors)
    rem.runner()
