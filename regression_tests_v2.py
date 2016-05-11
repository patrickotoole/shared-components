from regression_objects import *
from link import lnk

SQL1 = "select url_pattern from action_with_patterns where pixel_source_name='{}'"


V1_UNCACHE= {
                'domain':"/crusher/v1/visitor/domains?url_pattern={}",
                'domains_full':  "/crusher/v1/visitor/domains_full?url_pattern={}",
                'keywords':"/crusher/v1/visitor/keywords?url_pattern={}",
                'hourly': "/crusher/v1/visitor/hourly/cache?url_pattern={}",
                'sesisons': "/crusher/v1/visitor/sessions?url_pattern={}",
                'before_and_after' : "/crusher/v1/visitor/before_and_after?url_pattern={}",
                'model': "/crusher/v1/visitor/model?url_pattern={}"
            }

V1_CACHE = {
                'domain':"/crusher/v1/visitor/domains/cache?url_pattern={}",
                'domains_full':  "/crusher/v1/visitor/domains_full/cache?url_pattern={}",
                'keywords':"/crusher/v1/visitor/keywords/cache?url_pattern={}",
                'hourly': "/crusher/v1/visitor/hourly/cache?url_pattern={}",
                'sesisons': "/crusher/v1/visitor/sessions/cache?url_pattern={}",
                'before_and_after' : "/crusher/v1/visitor/before_and_after/cache?url_pattern={}",
                'model': "/crusher/v1/visitor/model/cache?url_pattern={}"
            }

V2_UNCACHE = {
                'domain' : "/crusher/v2/visitor/domains?url_pattern={}"
                'domains_full' : "/crusher/v2/visitor/domains_full?url_pattern={}"
                'keywords' : "/crusher/v2/visitor/keywords?url_pattern={}"
                'hourly' : "/crusher/v2/visitor/hourly?url_pattern={}"
                'sessions' : "/crusher/v2/visitor/sessions?url_pattern={}"
                'before_and_after' : "/crusher/v2/visitor/before_and_after?url_pattern={}"
                'model' : "/crusher/v2/visitor/model?url_pattern={}"
            }

V2_CACHE = {
                'domain' : "/crusher/v2/visitor/domains/cache?url_pattern={}"
                'domains_full' : "/crusher/v2/visitor/domains_full/cache?url_pattern={}"
                'keywords' : "/crusher/v2/visitor/keywords/cache?url_pattern={}"
                'hourly' : "/crusher/v2/visitor/hourly/cache?url_pattern={}"
                'sessions' : "/crusher/v2/visitor/sessions/cache?url_pattern={}"
                'before_and_after' : "/crusher/v2/visitor/before_and_after/cache?url_pattern={}"
                'model' : "/crusher/v2/visitor/model/cache?url_pattern={}"
            }

def runTest(pattern, endpoint, version, crusher):
    try:
        URL = version[endpoint]
        _resp = crusher.get(URL.format(pattern))
        if _resp.status_code==200:
            _resp_data = _resp.json
            _resp_data_check = {}
            keys = _resp_data.keys()
            for k in keys:
                _resp_data_check[k] = (type(_resp_data[k]), len(_resp_data[k]))
        else:
            print "FAIL!!!!!!!!"

def getCrusher(advertiser, url):
    crusher = lnk.api.crusher
    crusher.user="a_{}".format(advertiser)
    crusher.admin="admin"
    crusher.base_url = url
    crusher.authenticate()
    return crusher

def runURLCheck(advertiser, url, version, segment, check_cache=True):
    crusher = getCrusher(advertiser, url)
    urls = URL_OBJECT[version]
        if check_cache:
            cache_result = checkCache(pattern, urls, crusher)
            results['cache'] = cache_result
        uncache_result = checkRaw(pattern, urls, crusher)
        results['raw'] = uncache_result
    return results

def runChecks(advertiser, version="V2",segment, local_url=False):
    results = {}
    if run_local:
        results['local'] =runURLCheck(advertiser, local_url, version, segment)
    results['beta'] = runURLCheck(advertiser, 'beta.crusher.getrockerbox.com', version, segment)
    results['prod'] = runURLCheck(advertiser, 'crusher.getrockerbox.com', version, segment)


if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="")
    define("base_url", default="http://192.168.99.100:9001")
    define("run_beta", default=False)

    basicConfig(options={})

    parse_command_line()

    crusher = lnk.api.crusher
    crusher.user = "a_{}".format(options.advertiser)
    crusher.password="admin"
    crusher.base_url = options.base_url
    crusher.authenticate()
    checkAdvertiserCache(options.advertiser,crusher)
