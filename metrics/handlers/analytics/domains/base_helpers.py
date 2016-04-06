import pandas
from lib.helpers import *

def calc_transform_urls(x):
    return [
        {"url":i,"count":j} for i,j in
        (x.groupby("url").occurrence.sum() + 1).T.to_dict().items()
    ]

def dom_to_domains(dom):
    if hasattr(dom[0][1],"uid"):
        dom[0][1]['date'] = dom[0][1].timestamp.map(lambda x: x.split(" ")[0] + " 00:00:00")
        df = dom[0][1].groupby(["date","domain"])['uid'].agg(lambda x: len(set(x)))
        return df.reset_index().rename(columns={"uid":"count"})
    else:
        return dom[0][1].reset_index().rename(columns={"occurrence":"count"})


def transform_domains(x):
    return [
        {"domain":i,"count":j} for i,j in
        (x.groupby("domain")['count'].sum() + 1).T.to_dict().items()
    ]

def group_sum_sort_np_array(arr,key,sortby="count"):
    import itertools

    df = pandas.DataFrame(list(itertools.chain.from_iterable(arr)))
    return df.groupby(key).sum().reset_index().sort_index(by=sortby,ascending=False)

def default_response(terms,logic,no_results=False):

    response = {
        "search": terms,
        "logic": logic,
        "results": [],
        "summary": {}
    }

    if no_results: del response['results']

    return response

def response_domains(response,domains_df):
    results = Convert.df_to_values(domains_df)
    response['domains'] = results

    return response
