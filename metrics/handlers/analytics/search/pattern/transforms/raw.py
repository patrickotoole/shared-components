import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_raw(idf=None,domains=None,category_domains=None,uid_urls=None,urls=None,url_to_action=None,response=None,**kwargs):
    import ipdb; ipdb.set_trace()
    if type(idf) != type(None):
        response['idf'] = idf.to_dict()
    if type(domains) != type(None):
        response['domain'] = domains.to_dict()
    if type(category_domains) != type(None):
        response['category_domains'] = category_domains.to_dict()
    if type(uid_urls) != type(None):
        response['uid_urls'] = uid_urls.to_dict()
    if type(urls) != type(None):
        response['urls'] = urls.to_dict()
    if type(url_to_action) != type(None):
        response['url_to_action'] = url_to_action.to_dict()

    return response



