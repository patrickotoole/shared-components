from link import lnk

SQL1 = "select url_pattern from action_with_patterns where pixel_source_name='{}'"

URL1 = "/crusher/v1/visitor/domains/cache?url_pattern={}"
URL2 = "/crusher/v1/visitor/domains_full/cache?url_pattern={}"
URL3 = "/crusher/v1/visitor/keywords/cache?url_pattern={}"
URL4 = "/crusher/v1/visitor/hourly/cache?url_pattern={}"
URL5 = "/crusher/v1/visitor/sessions/cache?url_pattern={}"
URL6 = "/crusher/v1/visitor/before_and_after/cache?url_pattern={}"
URL7 = "/crusher/v1/visitor/model/cache?url_pattern={}"

def checkAdvertiserCache(advertiser, crusher):
    db = lnk.dbs.rockerbox
    results = {}
    segments = db.select_dataframe(SQL1.format(advertiser))    
    for pattern in segments.iterrows():
        print pattern[1]['url_pattern']
        results[pattern[1]['url_pattern']]={}
        #domains cache
        try:
            resp1 = crusher.get(URL1.format(pattern[1]['url_pattern']), timeout=60)
            if resp1.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['domains'] = "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['domains']="Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['domains'] = "Fail"
        #domains full cache
        try:
            resp2 = crusher.get(URL2.format(pattern[1]['url_pattern']), timeout=60)
            if resp2.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['domains_full'] = "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['domains_full'] = "Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['domains_full'] = "Fail"
        #keywords cache
        try:
            resp3 = crusher.get(URL3.format(pattern[1]['url_pattern']), timeout=60)
            if resp3.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['keywords'] = "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['keywords'] = "Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['keywords'] = "Fail"
        #hourly cache
        try:
            resp4 = crusher.get(URL4.format(pattern[1]['url_pattern']), timeout=60)
            if resp4.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['hourly'] = "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['hourly'] = "Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['hourly'] = "Fail"
        #sessions cache
        try:
            resp5 = crusher.get(URL5.format(pattern[1]['url_pattern']), timeout=60)
            if resp5.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['sessions'] = "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['sessions'] = "Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['sesions'] = "Fail"
        #before and after cache
        try:
            resp6 = crusher.get(URL6.format(pattern[1]['url_pattern']), timeout=60)
            if resp6.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['bfore_n_after']= "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['before_n_after'] = "Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['before_n_after'] = "Fail"
        #model cache
        try:
            resp7 = crusher.get(URL7.format(pattern[1]['url_pattern']), timeout=60)
            if resp7.status_code==200:
                print "Win"
                results[pattern[1]['url_pattern']]['mode'] = "Win"
            else:
                print "Fail"
                results[pattern[1]['url_pattern']]['model'] = "Fail"
        except:
            print "Fail"
            results[pattern[1]['url_pattern']]['model'] ="Fail"

    print results
    return True

def runRegressions(advertiser, url):
    return True

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
