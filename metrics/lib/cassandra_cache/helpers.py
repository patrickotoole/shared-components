import logging

def build_datelist(numdays,offset=0):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(offset, numdays+offset)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def simple_append(result,results,*args):
    results += result

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
    increments.name = "count"

    return increments.reset_index()[["count"]+indices]

    
def group_all_and_count(df,name="count"):
    counted = df.groupby(list(df.columns))["url"].count()
    counted.name = name
    return counted.reset_index()
 
