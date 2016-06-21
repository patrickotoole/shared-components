from link import lnk
from kazoo.client import KazooClient
import logging

QUERY = "select advertiser, pattern from batch_job_errors_today group by advertiser, pattern"
QUERY1 = "select advertiser, pattern from batch_job_errors_today group by advertiser, pattern having advertiser='{}'"
SETQUERY = "update action set ToDelete='yes' where advertiser='%s' and pattern='%s' and filter_id='%s'"

class Remover():

    def __init__(self, connectors):
        self.connectors = connectors

    def get_segs(self):
        df = self.connectors['crushercache'].select_dataframe(QUERY)
        return df

    def set_to_del(self, crusher, pattern):
        #df['advertiser'][0]
        import ipdb; ipdb.set_trace()
        _resp = crusher.get('/crusher/pattern_search/timeseries_only?search={}'.format(pattern))
        data = _resp.json()
        data_dict = dict(data['results'][0])
        has_data = False
        for key, val in data_dict.items():
            if key == 'views':
                if value >0:
                    has_data = True
            if has_data:
                break
        return has_data

    def set_pattern_to_delete(self,pattern):
        #self.connectors['crushercache'].execute(SETQUERY, ())
        return True

    def runner(self):
        df = self.get_segs()
        for row in df.iterrows():
            import ipdb; ipdb.set_trace()
            crusher = self.get_crusher_obj(row['advertiser'])
            to_delete  = self.set_to_del(crusher, row['pattern'])
                if to_delete:
                    self.set_pattern_to_delete(row['pattern'])
                    logging.info("deleted %s" % row['pattern'])

if __name__ == "__main__":
    zk = KazooClient(hosts="zk1:2181")
    zk.start()

    connectors = {'db': lnk.dbs.rockerbox, 'crushercache':lnk.dbs.crushercache}#, 'zk':zk, 'cassandra':''}
    rem = Remover(connectors)
    import ipdb; ipdb.set_trace()
