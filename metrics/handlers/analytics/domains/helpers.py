def build_datelist(numdays):
    import datetime
    
    base = datetime.datetime.today()
    date_list = [base - datetime.timedelta(days=x) for x in range(0, numdays)]
    dates = map(lambda x: str(x).split(" ")[0] + " 00:00:00",date_list)

    return dates

def filter_fraud(df):

    uids = df.groupby("uid")["uid"].count()
    bad_uids = list(uids[uids > 1000].index)

    bad_domain_uids = list(set(df[df.domain == "pennlive.com"].uid))
    df = df[~df.uid.isin(bad_uids) & ~df.uid.isin(bad_domain_uids)]

    return df


