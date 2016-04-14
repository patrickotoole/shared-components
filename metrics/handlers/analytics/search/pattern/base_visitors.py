import time

from twisted.internet import defer, threads

from lib.cassandra_cache.helpers import build_datelist

from transforms.temporal import *
from transforms.sessions import *
from transforms.timing import *
from transforms.before_and_after import *
from transforms.domain_intersection import *
from transforms.raw import *
from model import process_model
from generic import GenericSearchBase
import lib.custom_defer as custom_defer
from ...domains.base_domain_handler import BaseDomainHandler
from ...domains.base_helpers import *

DEFAULT_FUNCS = [process_before_and_after, process_hourly, process_sessions, process_domain_intersection, process_model, process_raw]


class VisitorBase(GenericSearchBase, BaseDomainHandler):

    DEFAULT_FUNCS = DEFAULT_FUNCS


    @defer.inlineCallbacks
    def process_uids(self,funcs=DEFAULT_FUNCS,**kwargs):

        logging.info("Started process_uids...")
        _dl = [threads.deferToThread(fn,*[],**kwargs) for fn in funcs]
        dl = defer.DeferredList(_dl)
        responses = yield dl

        logging.info("Finished process_uids.")

        logging.info("Started transform...")
        response = kwargs.get("response")

        if len(kwargs.get("uids",[])) > 0:

            response['results'] = uids
            response['summary']['num_users'] = len(response['results'])

        logging.info("Finished transform.")

        defer.returnValue(response)
        


    @custom_defer.inlineCallbacksErrors
    def get_uids(self, advertiser, pattern_terms, num_days=20, process=False, filter_id=False, *args, **kwargs):

        NUM_DAYS = 2
        ALLOW_SAMPLE = True
        response = default_response(pattern_terms,"and")
        args = [advertiser,pattern_terms[0][0],build_datelist(NUM_DAYS),NUM_DAYS,response,ALLOW_SAMPLE,filter_id]

        now = time.time()

        kwargs = yield self.build_arguments(*args)


        if process:
            response = yield self.process_uids(funcs=process, **kwargs)
        elif type(process) == type([]):
            response = yield self.process_uids(funcs=[], **kwargs)
        else:
            response = yield self.process_uids(**kwargs)

        self.write_json(response)
