import requests, json, logging, pandas, pickle
import ujson
from lib.zookeeper import CustomQueue 
from link import lnk
from lib.pandas_sql import s as _sql
import datetime
from kazoo.client import KazooClient

GET_UDFS = "select udf from user_defined_functions where advertiser = '{}'"
QUERY = "select a.url_pattern, a.action_id, a.action_name from action_with_patterns a join action b on a.action_id = b.action_id where a.pixel_source_name = '{}' and b.deleted=0 and b.active=1"

class UDFCache:
    def __init__(self, connectors):
        self.connectors = connectors

    def run_local(self, **kwargs):
        import lib.caching.generic_udf_runner as runner
        kwargs['func_name']= kwargs['udf']
        kwargs['connectors'] = self.connectors
        runner.runner(**kwargs)

    def add_db_to_work_queue(self, **kwargs):
        import lib.caching.generic_udf_runner as runner
        kwargs['identifiers'] = "udf_{}_cache".format(kwargs['udf'])
        kwargs['func_name'] = kwargs['udf']
        work = pickle.dumps((
                runner.runner,
                kwargs
                ))
        volume = "v{}".format(datetime.datetime.now().strftime('%m%y'))
        CustomQueue.CustomQueue(self.connectors['zk'],"python_queue", "log", volume, 0).put(work,1, debug=kwargs['debug'])
        logging.info("added to UDF work queue %s for %s" %(kwargs['pattern'],kwargs['advertiser'])) 

    def run_udfs(self, **kwargs):
        for udf in kwargs['udfs']:
            kwargs['udf'] = udf
            if kwargs['onqueue']:
                self.add_db_to_work_queue(**kwargs)
            else:
                self.run_local(**kwargs)

    def run_advertiser(self,**kwargs):
        segments = kwargs['connectors']['db'].select_dataframe(QUERY.format(kwargs['advertiser']))
        if kwargs.get('connectors',False):
            kwargs.pop('connectors')
        for i,seg in segments.iterrows():
            kwargs['pattern'] = seg['url_pattern']
            kwargs['filter_id'] = seg['action_id']
            self.run_udfs(**kwargs)

    def run_segment(self, **kwargs):
        self.run_udfs(**kwargs)


def runner(**kwargs):
    UC = UDFCache(kwargs['connectors'])
    UC.run_advertiser(**kwargs)

if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default=False)
    define("run_local", default=False)
    define("udf", default=False)
    define("filter_id", default=False)
    define("base_url", default="http://beta.crusher.getrockerbox.com")
    define("parameters", default='{}')
    define("debug", default=False)
    define("url", default=False)

    basicConfig(options={})
    parse_command_line()
    func_parameters = ujson.loads(options.parameters)
    connectors = {'db': lnk.dbs.rockerbox, 'crushercache':lnk.dbs.crushercache, 'zk':'', 'cassandra':''}
    UC = UDFCache(connectors)
    kwargs={}
    kwargs['connectors'] = connectors
    kwargs['advertiser']=options.advertiser
    kwargs['pattern'] = options.pattern
    kwargs['onqueue'] = not options.run_local
    kwargs['filter_id'] =options.filter_id
    kwargs['parameters'] = func_parameters
    kwargs['base_url'] = options.base_url
    kwargs['debug'] = options.debug
    kwargs['udfs'] = [options.udf] if options.udf else ['domains', 'domains_full', 'before_and_after', 'model', 'hourly','sessions']
    kwargs['url'] =options.url
    
    if kwargs['pattern'] or kwargs['url']:
        UC.run_segment(**kwargs)
    else:
        UC.run_advertiser(**kwargs)

