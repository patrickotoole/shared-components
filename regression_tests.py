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

def checkAdvertiserDB(advertiser):
    db = lnk.dbs.rockerbox
    results = {}
    segments = db.select_dataframe(SQL1.format(advertiser))
    for pattern in segments.iterrows():
        print pattern[1]['url_pattern']
        results[pattern[1]['url_pattern']] = {}
        #domains cache
        try:
            sl = "select * from action_dashboard_cache where advertiser={} and url_pattern={}"
            r1 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r1) >0:
                results[pattern[1]['url_pattern']]['domains'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['domains'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['domains'] = "Fail"
            print "fail"
        #domains full
        try:
            sl = "select * from full_domain_cache_test where advertiser={} and url_pattern={}"
            r2 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r2) >0:
                results[pattern[1]['url_pattern']]['domains_full'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['domains_full'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['domains_full'] = "Fail"
            print "fail"
        #keywords
        try:
            sl = "select * from keyword_cache_test where advertiser={} and url_pattern={}"
            r3 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r3) >0:
                results[pattern[1]['url_pattern']]['keywords'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['keywords'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['keywords'] = "Fail"
            print "fail"
        #onsite sessions
        try:
            sl = "select * from uids_only_sessions_cache where advertiser={} and url_pattern={}"
            r4 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r4) >0:
                results[pattern[1]['url_pattern']]['onsite_sessions'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['onsite_sessions'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['onsite_sessions'] = "Fail"
            print "fail"
        #onsite visits
        try:
            sl = "select * from uids_only_visits_cache where advertiser={} and url_pattern={}"
            r5 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r5) >0:
                results[pattern[1]['url_pattern']]['onsite_visits'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['onsite_visits'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['onsite_visits'] = "Fail"
            print "fail"
        #before and after
        try:
            sl = "select * from transform_before_and_after_cache where advertiser={} and url_pattern={}"
            r6 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r6) >0:
                results[pattern[1]['url_pattern']]['before_n_after'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['before_n_after'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['before_n_after'] = "Fail"
            print "fail"
        #hourly
        try:
            sl = "select * from transform_hourly_cache where advertiser={} and url_pattern={}"
            r7 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r7) >0:
                results[pattern[1]['url_pattern']]['hourly'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['hourly'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['hourly'] = "Fail"
            print "fail"
        #sessions
        try:
            sl = "select * from transform_sessions_cache where advertiser={} and url_pattern={}"
            r8 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r8) >0:
                results[pattern[1]['url_pattern']]['sessions'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['sessions'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['sessions'] = "Fail"
            print "fail"
        #models
        try:
            sl = "select * from transform_model_cache where advertiser={} and url_pattern={}"
            r9 = db.select_dataframe(sl.format(advertiser, pattern[1]['url_pattern']))
            if len(r9) >0:
                results[pattern[1]['url_pattern']]['models'] = "Win"
                print "win"
            else:
                results[pattern[1]['url_pattern']]['models'] = "Fail"
                print "fail"
        except:
            results[pattern[1]['url_pattern']]['models'] = "Fail"
            print "fail"
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
