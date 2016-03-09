import tornado.web
import pandas
import logging

from ...search.pattern.generic import GenericSearchBase

class VisitorTransformHandler(GenericSearchBase):

    def initialize(self, db=None, cassandra=None, zookeeper=None, **kwargs):
        self.logging = logging
        self.db = db
        self.cassandra = cassandra
        self.zookeeper = zookeeper
        self.DOMAIN_SELECT = "SELECT uid, domain, timestamp FROM rockerbox.visitor_domains_full where uid = ?"



    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, api_type):
        advertiser = self.current_advertiser_name
        terms = self.get_argument("url_pattern", False)

        process = filter(lambda x: ("process_" + api_type) in x.__name__, self.DEFAULT_FUNCS)

        if len(process):
            self.get_uids(advertiser,[[terms]],20,process=process)
        else:
            self.get_uids(advertiser,[[terms]],20,process=[])
