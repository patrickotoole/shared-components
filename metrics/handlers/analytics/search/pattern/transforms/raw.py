import logging
import pandas
from temporal import *
from lib.helpers import decorators
from twisted.internet import defer, threads


def process_raw(idf=None,domains=None,category_domains=None,uid_urls=None,urls=None,url_to_action=None,response=None,**kwargs):

    if idf:
        response['idf'] = idf.to_dict().values()
    if domains:
        response['domain'] = domains.to_dict().values()
    if category_domains:
        response['category_domains'] = category_domains.to_dict().values()
    if uid_urls:
        response['uid_urls'] = uid_urls.to_dict().values()
    if urls:
        response['urls'] = urls.to_dict().values()
    if url_to_action:
        response['url_to_action'] = url_to_action.to_dict().values()

    return response



