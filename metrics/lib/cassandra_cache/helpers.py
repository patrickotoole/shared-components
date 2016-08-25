import logging

def build_datelist(numdays,offset=0):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(offset, numdays+offset)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def sorted_append(index):

    def append(result,results,*args):
        if len(result):
            results[result[0][index]] = results.get(result[0][index],[])
            results[result[0][index]] += [{i:j for i,j in r.items() if i != index} for r in result]

    return append

def simple_append(result,results,*args):
    results += result

def key_counter(key):
    
    def count(result,results,*args):
        import collections
        keys = set([k[key] for k in result ])
        if type(results.get('domains', False)) == collections.Counter:
            results['domains'].update(list(keys))
        else:
            results.update(list(keys))
    
    return count


def cat_counter(key):

    def count_cat(categories, result, results, *args):
        keys = set([ categories.get(k[key],"") for k in result ])
        results['categories'].update(list(keys))

    return count_cat

def key_counter_hour(key):

    def count(result,results,*args):
        def get_domain_hour(x):
            hour = x['timestamp'].split(" ")[1].split(":")[0]
            return (hour, x[key])
        keys = set([ get_domain_hour(k) for k in result ])
        results['domains_hour'].update(list(keys))

    return count

def cat_counter_hour(key):

    def count_cat(categories, result, results, *args):
        def get_cat_hour(x):
            hour = x['timestamp'].split(" ")[1].split(":")[0]
            return (hour, categories.get(x[key],""))
        keys = set([ get_cat_hour(k) for k in result ])
        results['category_hour'].update(list(keys))

    return count_cat

def wrapped_select_callback(field):

    def select_callback(result,*args):
        advertiser, pattern, i1, i2, i3 = args
        
        result = result[0]
        res = result['rockerbox.' + field]
        
        date = result["date"]
        for url_uid in res:
            if "[:]" in url_uid:
                url, uid = url_uid.split("[:]")
                i1 += [[advertiser,date,pattern,uid,int(uid[-2:]),url,int(res[url_uid])]]
                i2 += [[advertiser,date,pattern,uid,int(uid[-2:])]]
                i3 += [[advertiser,date,pattern,url]]
                if (len(i1) % 5000) == 0: logging.info("Cache %s => %s raw results: %s" % (advertiser,pattern,len(i1)))

    return select_callback



def select_callback(result,*args):
    advertiser, pattern, i1, i2, i3 = args
    
    result = result[0]
    res = result['rockerbox.group_and_count(url, uid)']
    
    
    date = result["date"]
    for url_uid in res:
        if "[:]" in url_uid:
            url, uid = url_uid.split("[:]")
            i1 += [[advertiser,date,pattern,uid,int(uid[-2:]),url,int(res[url_uid])]]
            i2 += [[advertiser,date,pattern,uid,int(uid[-2:])]]
            i3 += [[advertiser,date,pattern,url]]
            if (len(i1) % 5000) == 0: logging.info("Cache %s => %s raw results: %s" % (advertiser,pattern,len(i1)))

def compare_and_increment(new,old):
    """
    from a dataframe with new values 
    and a dataframe with old values
    produces the increments df to make the old look like the new
    """

    assert(list(old.columns) == list(new.columns))

    cols = list(old.columns)
    incrementor = cols[-1]
    indices = cols[:-1]

    _old = old.set_index(indices)
    _new = new.set_index(indices)

    joined = _new.join(_old,rsuffix="_old",how="outer")

    increments = joined[incrementor] - joined[incrementor + "_old"]
    increments = increments[increments > 0].map(int)
    
    increments = increments.append(joined[joined[incrementor + "_old"].isnull()][incrementor])
    increments.name = "count"

    return increments.reset_index()[["count"]+indices]

    
def group_all_and_count(df,name="count"):
    counted = df.groupby(list(df.columns))["url"].count()
    counted.name = name
    return counted.reset_index()
 
