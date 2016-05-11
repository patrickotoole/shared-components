from regression_objects import *
from link import lnk


def getCrusher(advertiser, url):
    crusher = lnk.api.crusher
    crusher.user="a_{}".format(advertiser)
    crusher.password="admin"
    crusher.base_url = url
    crusher.authenticate()
    return crusher

def runURLCheck(advertiser, url, version, pattern, check_cache=True):
    crusher = getCrusher(advertiser, url)
    urls = URL_OBJECT[version]
    results = {}
    if check_cache:
        cache_result = checkURLs(pattern, urls['cache'], crusher)
        results['cache'] = cache_result
    uncache_result = checkURLs(pattern, urls['raw'], crusher)
    results['raw'] = uncache_result
    return results

def checkURLs(pattern, urls, crusher):
    total_result={}
    for key in urls:
        endpoint_result = runTest(pattern, key, urls, crusher)
        total_result[key] = endpoint_result
    return total_result


def runTest(pattern, endpoint, urls, crusher):
    _resp_data_check = {}
    try:
        URL = urls[endpoint]
        _resp = crusher.get(URL.format(pattern))
        #import ipdb; ipdb.set_trace()
        if _resp.status_code==200:
            _resp_data = _resp.json
            _resp_data_check = {}
            keys = _resp_data.keys()
            for k in keys:
                _resp_data_check[k] = (type(_resp_data[k]), len(_resp_data[k]))
        else:
            _resp_data_check['response'] = None
    except:
        _resp_data_check['response'] = None
    return _resp_data_check

def runChecks(advertiser, version,pattern, local_url=False):
    results = {}
    if local_url:
        results['local'] =runURLCheck(advertiser, local_url, version, pattern)
    results['beta'] = runURLCheck(advertiser, 'http://beta.crusher.getrockerbox.com', version, pattern)
    results['prod'] = runURLCheck(advertiser, 'http://crusher.getrockerbox.com', version, pattern)
    return results

def Validate(results):
    if 'local' in results.keys():
        validated_dict = checkResultsWithLocal(results)
    else:
        validated_dict = checkResults(results)
    return validated_dict

def checkResultsWithLocal(results):
    final = {'raw':{}, 'cache':{}}
    for keys in results['beta']['raw'].keys():
        match = True if results['beta']['raw'][keys] == results['prod']['raw'][keys] == results['local']['raw'][keys] else False
        final['raw'][keys]=match
    for keys in results['beta']['cache'].keys():
        match = True if results['beta']['cache'][keys] == results['prod']['cache'][keys] == results['local']['cache'][keys] else False
        final['cache'][keys]=match
    return final

def checkResults(results):
    final = {'raw':{}, 'cache':{}}
    for keys in results['beta']['raw'].keys():
        match = True if results['beta']['raw'][keys] == results['prod']['raw'][keys] else False
        final['raw'][keys]=match
    for keys in results['beta']['cache'].keys():
        match = True if results['beta']['cache'][keys] == results['prod']['cache'][keys] else False
        final['cache'][keys]=match
    return final

if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("local_url", default=False)
    define("version", default="V1")

    basicConfig(options={})

    parse_command_line()

    results = runChecks(options.advertiser, options.version, options.pattern, options.local_url)
    print results
    print Validate(results)
