import tornado.web
import ujson
import pandas
import StringIO
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
QUERY = "SELECT * from rockerbox.tag_viewability "

class ViewabilityHandler(BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra

    @decorators.deferred
    def defer_get_viewablity(self,tag_ids,domains):
        WHERE = "where "
        if len(tag_ids):
            WHERE += (" tag_id in (" + ",".join(tag_ids) + ")")

        if len(domains):
            WHERE += (" and domain in ('" + "','".join(domains) + "')")

        return self.cassandra.select_dataframe(QUERY + WHERE )

    @defer.inlineCallbacks
    def get_viewability(self,tag_ids,domains):
        viewability = yield self.defer_get_viewablity(tag_ids,domains)
        viewability['percent_viewable'] = viewability['num_visible']/viewability['num_loaded']

        viewability_list = viewability.T.to_dict().values()
        self.write(ujson.dumps(viewability_list))
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        self.get_viewability(self.get_arguments("tag_id"),self.get_arguments("domain",[]))
