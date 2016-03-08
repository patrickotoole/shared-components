import logging
from temporal import *
from lib.helpers import decorators

@decorators.time_log
def process_hourly(uid_urls=None, category_domains=None, response=None, **kwargs):

    raw_urls = uid_urls
    domains_with_cat = category_domains

    _fn = {"visits":lambda x: len(x), "uniques": lambda x : len(set(x))}
    
    domains_with_cat['hour'] = domains_with_cat.timestamp.map(lambda x: x.split(" ")[1].split(":")[0])

    _grouped_uids = domains_with_cat.groupby(["parent_category_name","hour"])['uid']
    category_visits_uniques = _grouped_uids.agg(_fn)
    category_hourly = category_visits_uniques.reset_index()


    _grouped_hour_uids = raw_urls.groupby("hour")['uid']
    visits_hourly = _grouped_hour_uids.agg(_fn).reset_index()

    response['hourly_visits'] = visits_hourly.T.to_dict().values()

    return response

