import logging
import pandas
from temporal import *

def session_per_day(x):

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



def process_sessions(domains,domains_with_cat,users,urls,url_to_action,response):

    logging.info("Started sessions...")

    # sessions
    raw_urls = users
    users['ts'] = users.timestamp.map(pandas.to_datetime)
    summary = users.groupby(["uid","date","hour"]).ts.describe().unstack(3)


    vv = summary['count'].unstack("hour").reset_index()
    cols = ["session_start","session_end","session_length","start_hour","visits"]
    sessions = vv.groupby(["uid","date"]).apply(session_per_day).reset_index().set_index("uid")[cols]

    hours = [str(i) if len(str(i)) > 1 else "0" + str(i) for i in range(0,24)]

    logging.info("Finished sessions.")

    logging.info("Started url to action merge...")
    merged = raw_urls.merge(url_to_action.reset_index(),on="url",how="left")
    logging.info("Finished url to action merge.")

    logging.info("Started timing...")

    def uid_summary(x):
        bucket_sessions = sessions.ix[list(set(x))]
        if len(bucket_sessions[~bucket_sessions.visits.isnull()]) == 0:
            return [{}]

        subset = merged[merged.uid.isin(list(set(x)))]

        actions_by_hour = subset.groupby("hour")['actions'].apply(lambda x: pandas.DataFrame(pandas.Series([j for i in x for j in i ]),columns=["action"]).groupby("action")['action'].count() ).unstack("hour")
        actions_by_hour = actions_by_hour.T.ix[hours].fillna(0).T


        start_hours    = bucket_sessions.groupby("start_hour")['visits'].agg({"sessions":len,"visits":sum})
        session_length = bucket_sessions.groupby("session_length")['visits'].agg({"sessions":len,"visits":sum})
        session_visits = bucket_sessions.groupby("visits")['visits'].agg({"sessions":len,"total_visits":sum})


        ll = [{
            "session_starts": start_hours.reset_index().T.to_dict().values(),
            "session_length": session_length.reset_index().T.to_dict().values(),
            "session_visits": session_visits.reset_index().T.to_dict().values(),
            "actions": [{"key":i,"values":j} for i,j in actions_by_hour.T.reset_index().to_dict().items() if i != "index"]
        }]

        return ll



    xx = domains_with_cat.groupby(["parent_category_name","hour"])['uid'].agg({
        "visits":  lambda x: len(x),
        "uniques": lambda x: len(set(x)),
        "on_site": uid_summary
    })

    xx['on_site'] = xx['on_site'].map(lambda x: x[0])

    url_ts, domain_ts = url_domain_intersection_ts(urls,domains)

    logging.info("Finished timing.")

    response['hourly_domains'] = xx.reset_index().T.to_dict().values()
    response['domains'] = domain_ts.T.to_dict()
    response['actions_events'] = url_ts.T.to_dict()


    return response

