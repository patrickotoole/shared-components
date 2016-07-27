import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


HOURS = [str(i) if len(str(i)) > 1 else "0" + str(i) for i in range(0,24)]

def session_per_day(x):

    # this needs to be sped up...

    date = x.date.iloc[0].split(" ")[0]
    x = x[[i for i in x.columns if i not in ["uid","date"]]].iloc[0]

    session_start = []
    session_end = []
    session_visits = []

    i = 0
    for value in "|".join(map(str,x)).split("nan"):
        if len(value.replace("|","")) > 0:

            session_start += [i]
            i += len(value[1:-1].split("|"))
            session_end += [i-1]

            start = 1 if value[0] == "|" else None
            end = -1 if value[-1] == "|" else None

            values = map(int,value[start:end].split("|"))
            session_visits += [sum(values)]
        i += 1

    results = []
    for i,start in enumerate(session_start):
        end = session_end[i]
        results += [{
            "session_start": date + " " + str(start) + ":00:00",
            "session_end": date + " " + str(end) + ":00:00",
            "start_hour": start,
            "session_length": int(end) - int(start),
            "visits": session_visits[i]
        }]

    df = pandas.DataFrame(results)

    return df

@decorators.time_log
def process_action_merge(raw_urls,url_to_action):
    return raw_urls.merge(url_to_action.reset_index(),on="url",how="left")

@decorators.time_log
def get_sessions(users):
    users['ts'] = users.timestamp.map(pandas.to_datetime)
    summary = users.groupby(["uid","date","hour"]).ts.describe().unstack(3)


    vv = summary['count'].unstack("hour").reset_index()
    cols = ["session_start","session_end","session_length","start_hour","visits"]
    sessions = vv.groupby(["uid","date"]).apply(session_per_day).reset_index().set_index("uid")[cols]

    return sessions

def action_hour_grouper(x):

    d = {}
    for i in x:
        for j in i:
            d[j] = d.get(j,0) + 1

    return pandas.Series(d)
    #unrolled = [j for i in x for j in i ]
    #df = pandas.DataFrame(unrolled,columns=["actions"])

    #return df.groupby("actions")['actions'].count()

#@decorators.time_log
def category_action_by_hour(subset):
    actions_by_hour = subset.groupby("hour")['actions'].apply(action_hour_grouper).unstack("hour")
    actions_by_hour = actions_by_hour.T.ix[HOURS].fillna(0).T
    return actions_by_hour

#@decorators.time_log
def category_session_stats(bucket_sessions):

    BY = "visits"
    agg = {"sessions":len,"visits":sum}

    start_hours    = bucket_sessions.groupby("start_hour")[BY].agg(agg)
    session_length = bucket_sessions.groupby("session_length")[BY].agg(agg)
    session_visits = bucket_sessions.groupby("visits")[BY].agg(agg)

    session_visits.index.name = "visit_bucket"

    return {
        "session_starts": start_hours.reset_index().to_dict("records")  +[{"start_hour":0,'visits': 0, 'sessions': 0}],
        "session_length": session_length.reset_index().to_dict("records"),
        "session_visits": session_visits.to_dict("records")
    }

class NotAList():
    def __init__(self, x):
        self.item = x
    def get(self):
        return self.item

@decorators.time_log
def process_session_buckets(sessions,merged,domains_with_cat):

    # decently certain that this is inefficient... can it be sped up at all...

    def uid_summary(x):
        uids = list(set(x))
         
        bucket_sessions = sessions.ix[uids]
        if len(bucket_sessions[~bucket_sessions.visits.isnull()]) == 0:
            return NotAList({})

        subset = merged[merged.uid.isin(uids)]
        actions_by_hour = category_action_by_hour(subset)
        _d = category_session_stats(bucket_sessions)
        _d['actions'] = [{"key":i,"values":j} for i,j in actions_by_hour.T.reset_index().to_dict().items() if i != "index"]

        return NotAList(_d)


    #ll = list(domains_with_cat.groupby(["parent_category_name","hour"])['uid'])

    #_dl = [threads.deferToThread(uid_summary,*[l[1]],**{}) for l in ll]

    #dl = defer.DeferredList(_dl)
    #responses = yield dl

    xx = domains_with_cat.groupby(["parent_category_name","hour"])['uid'].agg({
        "visits":  lambda x: len(x),
        "uniques": lambda x: len(set(x)),
        "on_site": uid_summary
    })
    
    xx['on_site'] = xx['on_site'].map(lambda x: x.get())
    return xx
    

def process_sessions(category_domains=None,uid_urls=None,urls=None,url_to_action=None,response=None,**kwargs):

    domains_with_cat = category_domains
    raw_urls = uid_urls

    
    sessions = get_sessions(raw_urls) # 17 seconds
    merged = process_action_merge(raw_urls,url_to_action)
    hourly_domains  = process_session_buckets(sessions,merged,domains_with_cat) # 24 seconds

    response['hourly_domains'] = hourly_domains.reset_index().T.to_dict().values()

    return response



