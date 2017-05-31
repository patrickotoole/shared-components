import pandas
import json
import ujson
from lib.helpers import *

QUERY = "select prototype.test.* from prototype.test inner join (select a.uid from prototype.uid_test a inner join prototype.test b on a.advertiser='%s' and b.domain='%s' and a.uid = b.uid group by uid) sub on test.uid = sub.uid;"

KEYQUERY = "select prototype.test.* from prototype.test inner join (SELECT ut.uid FROM prototype.offsite off join prototype.uid_test ut on off.uid = ut.uid WHERE MATCH (off.url_sentence) AGAINST ('%s' IN NATURAL LANGUAGE MODE) and ut.advertiser='%s') sub on test.uid = sub.uid;"

class ApiHelper():

    @decorators.deferred
    def database_query(self, domain_filter, filter_id):
        advertiser = 'vimeo'
        data = self.prototype.select_dataframe(QUERY % (advertiser, domain_filter))
        resp = {"response":data.to_dict('records')}
        return resp


    @decorators.deferred
    def keyword_query(self, keyword, filter_id):
        advertiser = 'vimeo'
        data = self.prototype.select_dataframe(KEYQUERY % (keyword, advertiser))
        resp = {"response":data.to_dict('records')}
        return resp
