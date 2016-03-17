



def get_authenticate(url):
    from link import lnk
    api = lnk.api.crusher

    api.base_url = url
    api.user = "a_fsastore"
    api.password = "admin"

    api.authenticate()

    return api

import time

def run(api,url, location):
    now = time.time()
    data = api.get(url).json
    print "%s: %s : %s" % (location, url,time.time() - now)
    size = [len(data[x]) for x in data.keys()] if type(data) == dict else [len(data)]
    keys = data.keys() if type(data) == dict else ""
    return {"keys":keys, "size": sum(size)}

if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="")
    define("run_local", default="http://192.168.99.100:9001")
    define("run_beta", default=False)

    basicConfig(options={})

    parse_command_line()

    api_prod = get_authenticate("http://crusher.getrockerbox.com")
    api_local = get_authenticate(options.run_local)
    api_beta = get_authenticate("http://beta.crusher.getrockerbox.com")

    now = time.time()
    
    PATTERN = "bing"
    A = run(api_prod,"/crusher/pattern_search/uid_domains?search=%s" % PATTERN, "Production")
    B = run(api_local,"/crusher/pattern_search/uid_domains?search=%s" % PATTERN, "Local")
    if A['keys'] == B['keys'] and ((A['size']>0 and B['size']>0) or (A['size']==0 and B['size']==0)):
        print A['keys'] == B['keys']
    else:
        print A['keys']
        print B['keys']
    if options.run_beta:
        run(api_beta,"/crusher/pattern_search/uid_domains?search=%s" % PATTERN, "Beta")

    C=run(api_prod,"/crusher/v1/visitor/domains?url_pattern=%s&format=json" % PATTERN, "Production")
    D=run(api_local,"/crusher/v1/visitor/domains?url_pattern=%s&format=json" % PATTERN, "Local")
    if C['keys'] == D['keys'] and ((C['size']>0 and D['size']>0) or (C['size']==0 and D['size']==0)):
        print C['keys'] == D['keys']
    else:
        print C['keys']
        print D['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/domains?url_pattern=%s&format=json" % PATTERN, "Beta")

    E=run(api_prod,"/crusher/v1/visitor/domains/cache?url_pattern=%s&format=json" % PATTERN, "Production")
    F=run(api_local,"/crusher/v1/visitor/domains/cache?url_pattern=%s&format=json" % PATTERN, "Local")
    if E['keys'] == F['keys'] and ((E['size']>0 and F['size']>0) or (E['size']==0 and F['size']==0)):
        print E['keys'] == F['keys']
    else:
        print E['keys']
        print F['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/domains/cache?url_pattern=%s&format=json" % PATTERN, "Beta")

    G=run(api_prod,"/crusher/v1/visitor/domains_full?url_pattern=%s&format=json" % PATTERN, "Production")
    H=run(api_local,"/crusher/v1/visitor/domains_full?url_pattern=%s&format=json" % PATTERN, "Local")
    if G['keys'] == H['keys'] and ((G['size']>0 and H['size']>0) or (G['size']==0 and H['size']==0)):
        print G['keys'] == H['keys']
    else:
        print G['keys']
        print H['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/domains_full?url_pattern=%s&format=json" % PATTERN, "Beta")

    I=run(api_prod,"/crusher/v1/visitor/domains_full/cache?url_pattern=%s&format=json" % PATTERN, "Production")
    J=run(api_local,"/crusher/v1/visitor/domains_full/cache?url_pattern=%s&format=json" % PATTERN, "Local")
    if I['keys'] == J['keys'] and ((I['size']>0 and J['size']>0) or (I['size']==0 and J['size']==0)):
        print I['keys'] == J['keys']
    else:
        print I['keys']
        print J['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/domains_full/cache?url_pattern=%s&format=json" % PATTERN, "Beta")

    K=run(api_prod,"/crusher/v1/visitor/keywords?url_pattern=%s&format=json" % PATTERN, "Production")
    L=run(api_local,"/crusher/v1/visitor/keywords?url_pattern=%s&format=json" % PATTERN, "Local")
    if K['keys'] == L['keys'] and ((K['size']>0 and L['size']>0) or (K['size'] ==0 and L['size']==0)):
        print K['keys'] == L['keys']
    else:
        print K['keys']
        print L['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/keywords?url_pattern=%s&format=json" % PATTERN, "Beta")

    M=run(api_prod,"/crusher/v1/visitor/keywords/cache?url_pattern=%s&format=json" % PATTERN, "Production")
    N=run(api_local,"/crusher/v1/visitor/keywords/cache?url_pattern=%s&format=json" % PATTERN, "Local")
    if M['keys'] == N['keys'] and ((M['size']>0 and N['size']>0) or (M['size']==0 and N['size']==0)):
        print M['keys'] == N['keys']
    else:
        print M['keys']
        print N['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/keywords/cache?url_pattern=%s&format=json" % PATTERN, "Beta")

    O=run(api_prod, "/crusher/pattern_search/timeseries_only?search=%s" % PATTERN, "Production")
    P=run(api_local,"/crusher/pattern_search/timeseries_only?search=%s" % PATTERN, "Local")
    if O['keys'] == P['keys'] and ((O['size']>0 and P['size']>0) or (O['size']==0 and P['size']==0)):
        print O['keys'] == P['keys']
    else:
        print O['keys']
        print P['keys']
    if options.run_beta:
        run(api_beta, "/crusher/pattern_search/timeseries_only?search=%s" % PATTERN, "Beta")

    Q=run(api_prod, "/crusher/pattern_search/uids_only?search=%s" % PATTERN, "Production")
    R=run(api_local,"/crusher/pattern_search/uids_only?search=%s" % PATTERN, "Local")
    if Q['keys'] == R['keys'] and ((Q['size']>0 and R['size']>0) or (Q['size']==0 and R['size']==0)):
        print Q['keys'] == R['keys']
    else:
        print Q['keys']
        print R['keys']
    if options.run_beta:
        run(api_beta, "/crusher/pattern_search/uids_only?search=%s" % PATTERN, "Beta")

    S=run(api_prod, "/crusher/v1/visitor/onsite/cache?format=json&url_pattern=%s" % PATTERN, "Production")
    T=run(api_local,"/crusher/v1/visitor/onsite/cache?format=json&url_pattern=%s" % PATTERN, "Local")
    if S['keys'] == T['keys'] and ((S['size']>0 and T['size']>0) or (S['size']==0 and T['size']==0)):
        print S['keys'] == T['keys']
    else:
        print S['keys']
        print T['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/onsite/cache?format=json&url_pattern=%s" % PATTERN, "Beta")

    U=run(api_prod, "/crusher/v1/visitor/onsite?format=json&url_pattern=%s" % PATTERN, "Production")
    V=run(api_local,"/crusher/v1/visitor/onsite?format=json&url_pattern=%s" % PATTERN, "Local")
    if U['keys'] == V['keys'] and ((U['size']>0 and V['size']>0) or (U['size']==0 and V['size']==0)):
        print U['keys'] == V['keys']
    else:
        print U['keys']
        print V['keys']
    if options.run_beta:
        run(api_beta, "/crusher/v1/visitor/onsite?format=json&url_pattern=%s" % PATTERN, "Beta")

    W=run(api_prod, "/crusher/pattern_search/uids?search=%s" % PATTERN, "Production")
    X=run(api_local, "/crusher/pattern_search/uids?search=%s" % PATTERN, "Local")
    if W['keys'] == X['keys'] and ((W['size']>0 and X['keys']>0) or (W['size']==0 and X['size']==0)):
        print W['keys'] == X['keys']
    else:
        print W['keys']
        print X['keys']

    Y=run(api_prod, "/crusher/v1/visitor/hourly?url_pattern=%s" % PATTERN, "Production")
    Z=run(api_local, "/crusher/v1/visitor/hourly?url_pattern=%s" % PATTERN, "Local")
    if Y['keys'] == Z['keys'] and ((Y['size']>0 and Z['size']>0) or (Y['size']==0 and Z['size']==0)):
        print Y['keys'] == Z['keys']
    else:
        print Y['keys']
        print Z['keys']

    AA=run(api_prod, "/crusher/v1/visitor/sessions?url_pattern=%s" % PATTERN, "Production")
    AB=run(api_local, "/crusher/v1/visitor/sessions?url_pattern=%s" % PATTERN, "Local")
    if AA['keys'] == AB['keys'] and ((AA['size']>0 and AB['size']>0) or (AA['size']==0 and AB['size']==0)):
        print AA['keys'] == AB['keys']
    else:
        print AA['keys']
        print AB['keys']

    AC=run(api_prod, "/crusher/v1/visitor/model?url_pattern=%s" % PATTERN, "Production")
    AD=run(api_local, "/crusher/v1/visitor/model?url_pattern=%s" % PATTERN, "Local")
    if AC['keys'] == AD['keys'] and ((AC['size']>0 and AD['size']>0) or (AC['size']==0 and AD['size']==0)):
        print AC['keys'] == AD['keys']
    else:
        print AC['keys']
        print AD['keys']

    AE=run(api_prod, "/crusher/v1/visitor/before_and_after?url_pattern=%s" % PATTERN, "Production")
    AF=run(api_local, "/crusher/v1/visitor/before_and_after?url_pattern=%s" % PATTERN, "Local")
    if AE['keys'] == AF['keys'] and ((AE['size']>0 and AF['size']>0) or (AE['size']==0 and AF['size']==0)):
        print AE['keys'] == AF['keys']
    else:
        print AE['keys']
        print AF['keys']
