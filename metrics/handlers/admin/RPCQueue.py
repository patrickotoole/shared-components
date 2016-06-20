import ujson
from lib.zookeeper import CustomQueue

class RPCQueue():

    def __init__(self, zookeeper=None, **kwargs):
        self.zookeeper = zookeeper

    
    #def add_to_work_queue(self, fname, advertiser, pattern, filter_id):
    def add_to_work_queue(self, rpc_object):
        rpc_data = ujson.loads(rpc_object)

        if 'advertiser' in rpc_data.keys():
            pattern = rpc_data['advertiser']
        else:
            raise Exception('Pattern advertiser required')
        if 'udf' in rpc_data.keys():
            udf = rpc_data['udf']
        else:
            raise Exception('UDF parameter required')
        if 'pattern' in rpc_data.keys():
            pattern = rpc_data['pattern']
        else:
            raise Exception('Pattern parameter required')

        if 'base_url' in rpc_data.keys():
            base_url=rpc_data['base_url']
        else:
            base_url="http://beta.crusher.getrockerbox.com"
        if 'action_name' in rpc_data.keys():
            segment = rpc_Data['action']
        else:
            segment = False
        if 'filter_id' in rpc_data.keys():
            filter_id = rpc_data['filter_id']
        else:
            filter_id = False
        if 'parameters' in rpc_data.keys():
            parameters = rpc_data['parameters']
        else:
            parameters = {}

        if udf != 'recurring':
            import lib.caching.generic_udf_runner as runner
            work = pickle.dumps((
                runner.runner,
                [advertiser,segment, udf, base_url,  "udf_{}_cache".format(udf) , filter_id]
                ))
        CustomQueue.CustomQueue(self.connectors['zk'],"python_queue").put(work,2)
        logging.info("added to UDF work queue %s for %s" %(segment,advertiser))

