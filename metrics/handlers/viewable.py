import tornado.web
import ujson
import pandas
import StringIO
import logging

from base import BaseHandler
from twisted.internet import defer
from lib.helpers import decorators
QUERY = "SELECT * from rockerbox.tag_size_viewability "
QUERY2 = "SELECT * from rockerbox.domain_tag_viewability " 

class ViewabilityHandler(BaseHandler):
    def initialize(self, db=None, cassandra=None, **kwargs):
        self.db = db
        self.cassandra = cassandra

    @decorators.deferred
    def defer_get_viewablity(self,tag_ids,sizes,domains):
        where = []
        Q = QUERY2
        if len(tag_ids):
            Q = QUERY
            where.append(" tag_id in (" + ",".join(tag_ids) + ")")

        if len(domains):
            where.append(" domain in ('" + "','".join(domains) + "')")


        WHERE = "where " + " and ".join(where)
        logging.info(Q + WHERE)
        df = self.cassandra.select_dataframe(Q + WHERE )

        if len(sizes) and len(df):
            return df[df['size'].isin(sizes)]

        return df

    @defer.inlineCallbacks
    def get_viewability(self,tag_ids,sizes,domains):
        viewability = yield self.defer_get_viewablity(tag_ids,sizes,domains)
        if len(viewability):
            viewability['percent_viewable'] = viewability['num_visible']/viewability['num_loaded']

        viewability_list = viewability.T.to_dict().values()
        self.write(ujson.dumps(viewability_list))
        self.finish()

    #@tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        self.get_viewability(self.get_arguments("tag_id"),self.get_arguments("size",[]),self.get_arguments("domain",[]))
