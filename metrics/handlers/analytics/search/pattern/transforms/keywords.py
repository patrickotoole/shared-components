import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads
import keyword_model as model

def split_url(x):
    return x.replace("-","/").split("/")

def process_keywords(**kwargs):
    
    unigrams_list = kwargs['corpus'].to_dict('records')
    unigrams={}
    for unig in unigrams_list:
        unigrams[unig['word']] = unig['count']
    numWords = len(unigrams)
    
    def split_nltk_url(x):
        if x !="":
            return model.addToSet(x, unigrams, numWords)
        else:
            return [""]
    
    try:
        nltk = kwargs['url_arguments']['nltk'][0]
    except:
        nltk = False

    GROUPS = ["url","unique"]
    EXPAND_BY = "url"
    if nltk:
        split_func = split_nltk_url
    else:
        split_func = split_url
    def grouping_function(x):
        # want to return a series (or dataframe) that has our new expanded series as the index
        the_grouped = x[EXPAND_BY].iloc[0]
        split_version = split_func(the_grouped)
        values = x["unique"].values[0]
        return pandas.DataFrame(values,columns=["unique"],index=split_version)

    objA = kwargs['domains_full'].groupby(["url","uid"] ).count()
    objB = objA.reset_index()
    objB = objB.filter(['url', 'uid'])
    objC = objB.groupby(['url']).count()
    obj = objC.reset_index()
    obj.columns = ['url', 'unique']
    obj1 = obj.groupby(GROUPS).apply(grouping_function)
    obj2 = obj1.groupby(level=2)

    obj3 = pandas.DataFrame(obj2["unique"].sum())
    full_url_response = obj3.reset_index().sort(columns=["unique"], ascending=False)
    full_url_response.columns = ["url", "uniques"]

    mask1 = ~full_url_response['url'].str.contains("http")
    mask2 = ~full_url_response['url'].str.contains(".co")
    mask3 = ~full_url_response['url'].str.contains(".org")

    filtered_df = full_url_response[mask1 & mask2 & mask3]
    response = kwargs['response']
    response['response'] = filtered_df.to_dict('records')
    return response

