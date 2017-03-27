import time

import twisted
from twisted.internet import defer, threads

from lib.cassandra_cache.helpers import build_datelist

from transforms.temporal import *
from transforms.sessions import *
from transforms.timing import *
from transforms.before_and_after import *
from transforms.domain_intersection import *
from transforms.raw import *
from transforms.domains import *
from transforms.domains_full import *
from transforms.keywords import *
from transforms.onsite import *
from model import process_model
from generic import GenericSearchBase
import lib.custom_defer as custom_defer
from ...domains.base_domain_handler import BaseDomainHandler
from ...domains.base_helpers import *

DEFAULT_FUNCS = [process_before_and_after, process_hourly, process_sessions, process_domain_intersection, process_model, process_raw, process_domains, process_domains_full, process_keywords, process_onsite]


class VisitorBase(GenericSearchBase, BaseDomainHandler):

    DEFAULT_FUNCS = DEFAULT_FUNCS
    DEFAULT_DATASETS = ['domains','domains_full','urls','idf','uid_urls', 'url_to_action', 'category_domains', "corpus"]

    @defer.inlineCallbacks
    def process_uids(self,funcs=DEFAULT_FUNCS,**kwargs):
        logging.info("Started process_uids...")
        _dl = [threads.deferToThread(fn,*[],**kwargs) for fn in funcs]
        dl = defer.DeferredList(_dl)
        responses = yield dl
        check_defer_list(responses)
        logging.info("Finished process_uids.")

        logging.info("Started transform...")
        response = kwargs.get("response")

        if len(kwargs.get("uids",[])) > 0:

            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        logging.info("Finished transform.")

        defer.returnValue(response)
        


    @custom_defer.inlineCallbacksErrors
    def get_uids(self, advertiser, pattern_terms, num_days=20, process=False,  prevent_sample=None, num_users=20000, datasets=DEFAULT_DATASETS, filter_id=False, date=False, url_args={}, *args, **kwargs):

        NUM_DAYS = int(num_days)
        ALLOW_SAMPLE = not prevent_sample if prevent_sample is not None else None
        logging.info("Days: %s, Sample: %s" % (NUM_DAYS,ALLOW_SAMPLE))
        NUM_USERS = num_users
        response = default_response(pattern_terms,"and")
        if date:
            import datetime
            offset = (datetime.datetime.now() - datetime.datetime.strptime(date, '%Y-%m-%d')).days
            datelist = build_datelist(NUM_DAYS, offset)
        else:
            datelist = build_datelist(NUM_DAYS)
        args = [advertiser,pattern_terms[0][0],datelist,NUM_DAYS,response,ALLOW_SAMPLE,filter_id,NUM_USERS,datasets]

        now = time.time()
        kwargs = yield self.build_arguments(*args)
        kwargs['url_arguments'] = url_args

        if process:
            response = yield self.process_uids(funcs=process, **kwargs)
        elif type(process) == type([]):
            response = yield self.process_uids(funcs=[], **kwargs)
        else:
            response = yield self.process_uids(**kwargs)

        #df = pandas.DataFrame(response)
        if len(response) <=4 and len(response['results']) ==0 and len(response.get('response',[])) ==0:
            self.set_status(400)
            self.write({"error":"Response failed or was empty"})
            self.finish()
            defer.returnValue(None)
        versioning = self.request.uri
        if versioning.find('v2') >=0:
            #summary = self.summarize(df)
            self.get_content_v2(response)
        else:
            self.get_content_v1(response)   
