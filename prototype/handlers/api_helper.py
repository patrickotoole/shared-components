import pandas
import json
import ujson
from lib.helpers import *
from twisted.internet import defer
import custom_defer


ONSITEQUERY = "select uid, full_onsite_url, time, segments from prototype.onsite where match (segments) against ('{}' in boolean mode)"

DOMAINQUERY = """
select offsite.* from prototype.offsite 
join
(select onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where domain='{}') ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid;
"""

KEYWORDQUERY = """
select offsite.* from prototype.offsite 
join
(select onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where match (url_sentence) against ('{}' in natural language mode)) ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid
"""


class ApiHelper():

    def onsite_data(self,filter_id):
        df = self.prototype.select_dataframe(ONSITEQUERY.format(filter_id))
        df = df[['uid','full_onsite_url', 'time']]
        return df

    def offsite_domain_data(self,filter_id, domain):
        df = self.prototype.select_dataframe(DOMAINQUERY.format(domain, filter_id))
        return df

    def offsite_keyword_data(self,filter_id, keyword):
        df = self.prototype.select_dataframe(KEYWORDQUERY.format(keyword, filter_id))
        return df

    @decorators.deferred
    def domain_query(self, domain_filter, filter_id):
        onsite_df = self.onsite_data(filter_id)
        offsite_df = self.offsite_domain_data(filter_id, domain_filter) 
        resp = {"response":offsite_df.to_dict('records')}
        return resp

    @decorators.deferred
    def keyword_query(self, keyword, filter_id):
        onsite_df =  self.onsite_data(filter_id)
        offsite_df = self.offsite_keyword_data(filter_id, keyword)
        resp = {"response":offsite_df.to_dict('records')}
        return resp
