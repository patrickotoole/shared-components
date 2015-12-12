import pandas 

def time_groups(delta):
    minutes = [5,15,25,35,45,60,75,90,105,120,135,150,180,210,240,300,360,420,480,540,720,1080,1440,2880,4320,10080]

    for _min in minutes:
        if delta < _min:
            return _min

def get_idf(db,domain_set):
    QUERY = """
        SELECT p.*, c.parent_category_name 
        FROM reporting.pop_domain_with_category p 
        JOIN category c using (category_name) 
        WHERE domain in (%(domains)s)
    """

    domains = domains = "'" + "','".join(domain_set) + "'"

    return db.select_dataframe(QUERY % {"domains":domains})


def url_domain_intersection(urls,domains):

    assert("timestamp" in urls.columns)
    assert("timestamp" in domains.columns)
    assert("uid" in domains.columns)
    assert("uid" in urls.columns)


    url_uids = set(urls.uid)
    domain_uids = set(domains.uid)
    uids = url_uids.intersection(domain_uids)

    urls = urls[urls.uid.isin(uids)].drop_duplicates("uid")
    domains = domains[domains.uid.isin(uids)]

    domain_url_join = domains.merge(urls,on="uid",how="left",suffixes=["_domain","_event"]).dropna()

    return domain_url_join

def url_domain_intersection_ts(urls,domains):

    assert("timestamp" in urls.columns)
    assert("timestamp" in domains.columns)
    assert("uid" in domains.columns)
    assert("uid" in urls.columns)


    urls = urls.groupby("uid").apply(df_to_sorted_list(['timestamp','url'],"timestamp"))
    domains = domains.groupby("uid").apply(df_to_sorted_list(['timestamp','domain'],"timestamp"))

    domains = domains.ix[urls.index]
    domains = domains[~domains.isnull()]

    urls = urls.ix[domains.index]
    urls = urls[~urls.isnull()]

    return [domains,urls]


def before_and_after(df):
    assert("timestamp_domain" in df.columns)
    assert("timestamp_event" in df.columns)


    domain_ts = pandas.to_datetime(df.timestamp_domain)
    event_ts = pandas.to_datetime(df.timestamp_event)

    df['time_difference'] = domain_ts - event_ts
    after = df[df.time_difference > pandas.np.timedelta64(0,'ns')]
    before = df[df.time_difference <= pandas.np.timedelta64(0,'ns')]

    return [before,after]


def groupby_timedifference(df):
    assert("time_difference" in df.columns)
    assert("domain" in df.columns)
    assert("uid" in df.columns)

    zero = pandas.np.timedelta64(0, 's')

    df['time_bucket'] = df.time_difference.map(lambda x: x / pandas.np.timedelta64(60, 's') * (- 1 if x < zero else 1)).map(time_groups)
    grouped = df.groupby("time_bucket")
    grouped = grouped.apply(lambda x: x[['domain','uid']].drop_duplicates().groupby("domain")['uid'].count())
    return grouped.reset_index()


def category_time_buckets(merged): 

    assert("uid" in merged.columns)
    assert("time_bucket" in merged.columns)
    assert("parent_category_name" in merged.columns)

    bucket_df = merged.groupby(["time_bucket","parent_category_name"])['uid'].sum()
    
    # fill in missing time,category information
    bucket_df = bucket_df.unstack("parent_category_name").fillna(0).stack()
    category_totals = bucket_df.unstack("parent_category_name").T.sum()

    bucket_df = (bucket_df.unstack("parent_category_name").T / category_totals).T.stack("parent_category_name")
    bucket_df.name = "count"
    
    def run_this(x):
        values = x[["time_bucket","count"]].T.to_dict().values()
        return values
    
    bucket_categories = bucket_df.reset_index().groupby("parent_category_name").apply(run_this)
    return bucket_categories


def time_bucket_domains(merged):

    assert("uid" in merged.columns)
    assert("domain" in merged.columns)
    assert("time_bucket" in merged.columns)

    def run_this(x):
        summed = x.groupby(['domain','parent_category_name'])[['uid']].sum()
        return summed.reset_index().T.rename(columns={"uid":"count"}).to_dict().values()
        
    before_domains = merged.groupby("time_bucket").apply(run_this)
    return before_domains

def df_to_sorted_list(columns=False,sortby=False):

    cols = columns

    def run_this(df):
        columns = cols or df.columns
        df = df[columns]
        if sortby:
            df = df.sort_index(by=sortby)

        return df.to_dict(outtype="records")

    return run_this
