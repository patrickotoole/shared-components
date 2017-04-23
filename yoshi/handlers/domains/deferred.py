from lib.helpers import decorators
from api import *


class DomainsDeferred(DomainsAPI):

    @decorators.deferred
    def get_domains_queue_deferred(self, advertiser_id):
        return self.get_domains_queue(advertiser_id)