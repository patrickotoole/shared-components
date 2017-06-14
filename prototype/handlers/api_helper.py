import pandas
import json
import ujson
from lib.helpers import *
from twisted.internet import defer
import custom_defer
from udf_helper import *

ONSITEQUERY = "select uid, full_onsite_url, time, segments from prototype.onsite where match (segments) against ('{}' in boolean mode) limit 0, {}"

DOMAINQUERY = """
select offsite.* from prototype.offsite 
join
(select onsite.uid from prototype.onsite 
inner join 
(select uid from prototype.offsite where domain='{}') ofs 
on onsite.uid = ofs.uid
where segments like '%{}%') ons
on offsite.uid = ons.uid
limit 0,{}
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
limit 0,{}
"""

VERIFYQUERY = "select action_name from action_with_patterns where action_id={} and pixel_source_name='{}'"

class ApiHelper(UDFHandler):

    def onsite_data(self,filter_id, filter_limit):
        df = self.prototype.select_dataframe(ONSITEQUERY.format(filter_id, filter_limit))
        df = df[['uid','full_onsite_url', 'time']]
        return df

    def offsite_domain_data(self,filter_id, domain, filter_limit):
        df = self.prototype.select_dataframe(DOMAINQUERY.format(domain, filter_id, filter_limit))
        return df

    def offsite_keyword_data(self,filter_id, keyword, filter_limit):
        df = self.prototype.select_dataframe(KEYWORDQUERY.format(keyword, filter_id, filter_limit))
        return df

    def verify_filter_id(self, advertiser, filter_id):
        df = self.db.select_dataframe(VERIFYQUERY.format(filter_id, advertiser))
        if df.empty:
            valid=False
            self.write(ujson.dumps({"error": "not a valid filter id for given advertiser"}))
            self.set_status(400)
            self.finish()
        else:
            valid=True
        return valid

    @decorators.deferred
    def domain_query(self, domain_filter, filter_id, udf, advertiser, filter_limit):
        valid_advertiser_filter = self.verify_filter_id(advertiser, filter_id)
        if not valid_advertiser_filter:
            return None
        onsite_df = self.onsite_data(filter_id, filter_limit)
        offsite_df = self.offsite_domain_data(filter_id, domain_filter, filter_limit) 
        kwargs = {"onsite":onsite_df, "offsite":offsite_df}
        resp = self.run_udf(udf, kwargs)
        return resp

    @decorators.deferred
    def keyword_query(self, keyword, filter_id, udf, advertiser, filter_limit):
        valid_advertiser_filter = self.verify_filter_id(advertiser, filter_id)
        if not valid_advertiser_filter:
            return None
        onsite_df =  self.onsite_data(filter_id, filter_limit)
        offsite_df = self.offsite_keyword_data(filter_id, keyword, filter_limit)
        kwargs = {"onsite":onsite_df, "offsite":offsite_df}
        resp = self.run_udf(udf, kwargs)
        return resp
